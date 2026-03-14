#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::process::Stdio;

use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{ActivationPolicy, Manager, WindowEvent};
use tokio::process::Command;
use tokio::time::{sleep, Duration};
use tower_http::cors::CorsLayer;

const DEFAULT_PORT: u16 = 47321;

#[derive(Clone)]
struct AppState {
  port: u16,
}

struct MenuState<R: tauri::Runtime> {
  tray_menu: Menu<R>,
  status_item: MenuItem<R>,
  endpoint_item: MenuItem<R>,
  account_item: MenuItem<R>,
  repos_item: MenuItem<R>,
  install_item: MenuItem<R>,
  login_item: MenuItem<R>,
}

#[derive(Clone, Serialize)]
struct HealthResponse {
  ok: bool,
  app: &'static str,
  version: &'static str,
  port: u16,
}

#[derive(Clone, Serialize)]
struct GithubStatusResponse {
  gh_installed: bool,
  authenticated: bool,
  login: Option<String>,
  name: Option<String>,
  error: Option<String>,
}

#[derive(Serialize)]
struct RepoRecord {
  name_with_owner: String,
  private: bool,
  url: String,
}

#[derive(Serialize)]
struct RepositoryListResponse {
  repositories: Vec<RepoRecord>,
}

#[derive(Serialize)]
struct ActionResponse {
  ok: bool,
  message: String,
}

#[derive(Deserialize)]
struct CreateIssueRequest {
  repo: String,
  title: String,
  body: String,
  labels: Vec<String>,
}

#[derive(Serialize)]
struct CreateIssueResponse {
  issue_url: String,
}

#[derive(Serialize)]
struct ErrorResponse {
  error: String,
}

#[derive(Deserialize)]
struct Viewer {
  login: String,
  name: Option<String>,
}

#[derive(Deserialize)]
struct ApiRepo {
  full_name: String,
  private: bool,
  html_url: String,
}

#[tokio::main]
async fn main() {
  let port = env::var("TOSSUE_HELPER_PORT")
    .ok()
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(DEFAULT_PORT);

  tauri::Builder::default()
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .setup(move |app| {
      let state = AppState { port };
      app.manage(state.clone());
      app.set_activation_policy(ActivationPolicy::Accessory);

      let tray_menu = Menu::new(app)?;
      let status_item = MenuItem::with_id(app, "status-line", "Checking GitHub CLI...", true, None::<&str>)?;
      let endpoint_item = MenuItem::with_id(
        app,
        "endpoint-line",
        &format!("127.0.0.1:{port} starting..."),
        false,
        None::<&str>,
      )?;
      let account_item = MenuItem::with_id(app, "account-line", "Account: -", false, None::<&str>)?;
      let repos_item = MenuItem::with_id(app, "repos-line", "Repositories: -", false, None::<&str>)?;
      let install_item = MenuItem::with_id(app, "install-gh", "Install gh from cli.github.com", true, None::<&str>)?;
      let refresh_item = MenuItem::with_id(app, "refresh-status", "Refresh Status", true, None::<&str>)?;
      let login_item = MenuItem::with_id(app, "login-terminal", "Login in Terminal", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit-helper", "Quit Tossue Helper", true, None::<&str>)?;
      let separator = PredefinedMenuItem::separator(app)?;

      tray_menu.append_items(&[
        &status_item,
        &endpoint_item,
        &account_item,
        &repos_item,
        &install_item,
        &separator,
        &refresh_item,
        &login_item,
        &quit_item,
      ])?;

      app.manage(MenuState {
        tray_menu: tray_menu.clone(),
        status_item: status_item.clone(),
        endpoint_item: endpoint_item.clone(),
        account_item: account_item.clone(),
        repos_item: repos_item.clone(),
        install_item: install_item.clone(),
        login_item: login_item.clone(),
      });

      let tray_icon = app.default_window_icon().cloned();
      let mut tray_builder = TrayIconBuilder::with_id("tossue-helper")
        .menu(&tray_menu)
        .tooltip("Tossue Helper")
        .icon_as_template(true)
        .menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "status-line" | "endpoint-line" => {}
          "install-gh" => {
            #[cfg(target_os = "macos")]
            {
              tauri::async_runtime::spawn(async {
                let _ = Command::new("open")
                  .arg("https://cli.github.com/")
                  .stdout(Stdio::null())
                  .stderr(Stdio::null())
                  .output()
                  .await;
              });
            }
          }
          "refresh-status" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
              let _ = refresh_menu_state(&handle).await;
            });
          }
          "login-terminal" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
              let _ = open_gh_auth_login().await;
              sleep(Duration::from_secs(2)).await;
              let _ = refresh_menu_state(&handle).await;
            });
          }
          "quit-helper" => {
            app.exit(0);
          }
          _ => {}
        });

      if let Some(icon) = tray_icon {
        tray_builder = tray_builder.icon(icon);
      }

      let _ = tray_builder.build(app)?;

      tauri::async_runtime::spawn(async move {
        if let Err(error) = run_http_server(state).await {
          eprintln!("Tossue helper server failed: {error}");
        }
      });

      let handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        let _ = refresh_menu_state(&handle).await;
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("failed to run Tossue Helper");
}

async fn run_http_server(state: AppState) -> Result<(), String> {
  let router = Router::new()
    .route("/health", get(health))
    .route("/github/status", get(github_status))
    .route("/github/login", post(github_login))
    .route("/github/repositories", get(github_repositories))
    .route("/issues", post(create_issue))
    .layer(CorsLayer::very_permissive())
    .with_state(state.clone());

  let addr = SocketAddr::from(([127, 0, 0, 1], state.port));
  let listener = tokio::net::TcpListener::bind(addr)
    .await
    .map_err(|error| format!("failed to bind helper server: {error}"))?;

  axum::serve(listener, router)
    .await
    .map_err(|error| format!("helper server crashed: {error}"))
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
  Json(HealthResponse {
    ok: true,
    app: "Tossue Helper",
    version: env!("CARGO_PKG_VERSION"),
    port: state.port,
  })
}

async fn github_status() -> Result<Json<GithubStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
  Ok(Json(fetch_github_status().await))
}

async fn github_repositories() -> Result<Json<RepositoryListResponse>, (StatusCode, Json<ErrorResponse>)> {
  let query = "user/repos?per_page=100&sort=updated";
  let value = gh_api_json(&[query]).await.map_err(bad_gateway_error)?;
  let repositories: Vec<ApiRepo> = serde_json::from_value(value).map_err(internal_error)?;

  Ok(Json(RepositoryListResponse {
    repositories: repositories
      .into_iter()
      .map(|repo| RepoRecord {
        name_with_owner: repo.full_name,
        private: repo.private,
        url: repo.html_url,
      })
      .collect(),
  }))
}

async fn github_login() -> Result<Json<ActionResponse>, (StatusCode, Json<ErrorResponse>)> {
  if !command_exists("gh").await {
    return Err((
      StatusCode::BAD_REQUEST,
      Json(ErrorResponse {
        error: "GitHub CLI is not installed.".into(),
      }),
    ));
  }

  open_gh_auth_login()
    .await
    .map_err(bad_gateway_error)?;

  Ok(Json(ActionResponse {
    ok: true,
    message: "Opened GitHub CLI login flow in Terminal.".into(),
  }))
}

async fn create_issue(
  Json(payload): Json<CreateIssueRequest>,
) -> Result<Json<CreateIssueResponse>, (StatusCode, Json<ErrorResponse>)> {
  if payload.repo.trim().is_empty() || payload.title.trim().is_empty() || payload.body.trim().is_empty() {
    return Err((
      StatusCode::BAD_REQUEST,
      Json(ErrorResponse {
        error: "repo, title, and body are required.".into(),
      }),
    ));
  }

  ensure_labels_exist(&payload.repo, &payload.labels)
    .await
    .map_err(bad_gateway_error)?;

  let body_file = write_temp_issue_body(&payload.body).await.map_err(internal_error)?;
  let result = run_gh_issue_create(&payload, &body_file).await;
  let _ = tokio::fs::remove_file(&body_file).await;

  let issue_url = result.map_err(bad_gateway_error)?;
  Ok(Json(CreateIssueResponse { issue_url }))
}

async fn run_gh_issue_create(payload: &CreateIssueRequest, body_file: &PathBuf) -> Result<String, String> {
  let mut args = vec![
    "issue".to_string(),
    "create".to_string(),
    "--repo".to_string(),
    payload.repo.clone(),
    "--title".to_string(),
    payload.title.clone(),
    "--body-file".to_string(),
    body_file.to_string_lossy().to_string(),
  ];

  for label in payload
    .labels
    .iter()
    .map(|label| label.trim())
    .filter(|label| !label.is_empty())
  {
    args.push("--label".to_string());
    args.push(label.to_string());
  }

  let output = Command::new("gh")
    .args(&args)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .output()
    .await
    .map_err(|error| format!("failed to run gh issue create: {error}"))?;

  if !output.status.success() {
    return Err(stderr_text(&output.stderr));
  }

  let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
  if stdout.is_empty() {
    return Err("gh issue create succeeded but returned no URL.".into());
  }

  Ok(stdout)
}

async fn ensure_labels_exist(repo: &str, labels: &[String]) -> Result<(), String> {
  let normalized_labels: Vec<String> = labels
    .iter()
    .map(|label| label.trim())
    .filter(|label| !label.is_empty())
    .map(|label| label.to_string())
    .collect();

  if normalized_labels.is_empty() {
    return Ok(());
  }

  let existing = fetch_existing_labels(repo).await?;

  for label in normalized_labels {
    if existing.iter().any(|existing_label| existing_label == &label) {
      continue;
    }

    create_label(repo, &label).await?;
  }

  Ok(())
}

async fn fetch_existing_labels(repo: &str) -> Result<Vec<String>, String> {
  let endpoint = format!("repos/{repo}/labels?per_page=100");
  let value = gh_api_json(&[&endpoint]).await?;
  let labels = value
    .as_array()
    .ok_or_else(|| "failed to parse repository labels response.".to_string())?
    .iter()
    .filter_map(|item| item.get("name").and_then(|name| name.as_str()))
    .map(|name| name.to_string())
    .collect();

  Ok(labels)
}

async fn create_label(repo: &str, label: &str) -> Result<(), String> {
  let output = Command::new("gh")
    .args([
      "label",
      "create",
      label,
      "--repo",
      repo,
      "--color",
      "B86B2B",
      "--description",
      "Created by Tossue",
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .output()
    .await
    .map_err(|error| format!("failed to run gh label create: {error}"))?;

  if !output.status.success() {
    let stderr = stderr_text(&output.stderr);
    if stderr.contains("already exists") {
      return Ok(());
    }
    return Err(stderr);
  }

  Ok(())
}

async fn gh_api_json(args: &[&str]) -> Result<Value, String> {
  let mut command_args = vec!["api".to_string()];
  command_args.extend(args.iter().map(|item| item.to_string()));

  if args.first() == Some(&"user/repos?per_page=100&sort=updated") {
    command_args.push("--method".to_string());
    command_args.push("GET".to_string());
    command_args.push("--header".to_string());
    command_args.push("Accept: application/vnd.github+json".to_string());
  }

  let output = Command::new("gh")
    .args(&command_args)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .output()
    .await
    .map_err(|error| format!("failed to run gh api: {error}"))?;

  if !output.status.success() {
    return Err(stderr_text(&output.stderr));
  }

  serde_json::from_slice::<Value>(&output.stdout).map_err(|error| format!("failed to parse gh api output: {error}"))
}

async fn fetch_github_status() -> GithubStatusResponse {
  let installed = command_exists("gh").await;
  if !installed {
    return GithubStatusResponse {
      gh_installed: false,
      authenticated: false,
      login: None,
      name: None,
      error: Some("GitHub CLI is not installed.".into()),
    };
  }

  match gh_api_json(&["user"]).await {
    Ok(value) => match serde_json::from_value::<Viewer>(value) {
      Ok(viewer) => GithubStatusResponse {
        gh_installed: true,
        authenticated: true,
        login: Some(viewer.login),
        name: viewer.name,
        error: None,
      },
      Err(error) => GithubStatusResponse {
        gh_installed: true,
        authenticated: false,
        login: None,
        name: None,
        error: Some(format!("failed to parse gh user response: {error}")),
      },
    },
    Err(error) => GithubStatusResponse {
      gh_installed: true,
      authenticated: false,
      login: None,
      name: None,
      error: Some(error),
    },
  }
}

async fn fetch_repository_count() -> Result<usize, String> {
  let query = "user/repos?per_page=100&sort=updated";
  let value = gh_api_json(&[query]).await?;
  let repositories: Vec<ApiRepo> =
    serde_json::from_value(value).map_err(|error| format!("failed to parse repository list: {error}"))?;
  Ok(repositories.len())
}

async fn open_gh_auth_login() -> Result<(), String> {
  #[cfg(target_os = "macos")]
  {
    let script = r#"tell application "Terminal"
activate
do script "gh auth login --web -h github.com"
end tell"#;

    let output = Command::new("osascript")
      .arg("-e")
      .arg(script)
      .stdout(Stdio::piped())
      .stderr(Stdio::piped())
      .output()
      .await
      .map_err(|error| format!("failed to launch Terminal for gh auth login: {error}"))?;

    if !output.status.success() {
      return Err(stderr_text(&output.stderr));
    }

    return Ok(());
  }

  #[cfg(not(target_os = "macos"))]
  {
    Err("Interactive gh auth login launcher is currently implemented for macOS only.".into())
  }
}

async fn command_exists(program: &str) -> bool {
  Command::new(program)
    .arg("--version")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .status()
    .await
    .map(|status| status.success())
    .unwrap_or(false)
}

async fn write_temp_issue_body(body: &str) -> Result<PathBuf, String> {
  let mut path = env::temp_dir();
  path.push(format!("tossue-issue-{}.md", unique_suffix()));
  tokio::fs::write(&path, body)
    .await
    .map_err(|error| format!("failed to write temporary issue body: {error}"))?;
  Ok(path)
}

fn unique_suffix() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let millis = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|value| value.as_millis())
    .unwrap_or_default();
  millis.to_string()
}

fn stderr_text(stderr: &[u8]) -> String {
  let text = String::from_utf8_lossy(stderr).trim().to_string();
  if text.is_empty() {
    "command failed without stderr output.".into()
  } else {
    text
  }
}

fn internal_error(error: impl ToString) -> (StatusCode, Json<ErrorResponse>) {
  (
    StatusCode::INTERNAL_SERVER_ERROR,
    Json(ErrorResponse {
      error: error.to_string(),
    }),
  )
}

fn bad_gateway_error(error: impl ToString) -> (StatusCode, Json<ErrorResponse>) {
  (
    StatusCode::BAD_GATEWAY,
    Json(ErrorResponse {
      error: error.to_string(),
    }),
  )
}

async fn refresh_menu_state<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
  let menu_state = app.state::<MenuState<R>>();
  let status = fetch_github_status().await;

  if !status.gh_installed {
    menu_state.status_item.set_text("⚪ GitHub CLI: not installed")?;
    menu_state
      .endpoint_item
      .set_text(&format!("127.0.0.1:{} ready, gh not found", app.state::<AppState>().port))?;
    menu_state.account_item.set_text("Account: -")?;
    menu_state.repos_item.set_text("Repositories: -")?;
    ensure_install_item_visible(&menu_state)?;
    menu_state.login_item.set_enabled(false)?;
    return Ok(());
  }

  ensure_install_item_hidden(&menu_state)?;
  menu_state.login_item.set_enabled(true)?;

  if !status.authenticated {
    menu_state.status_item.set_text("⚪ GitHub CLI: not logged in")?;
    menu_state
      .endpoint_item
      .set_text(&format!("127.0.0.1:{} ready, login required", app.state::<AppState>().port))?;
    menu_state.account_item.set_text("Account: -")?;
    menu_state.repos_item.set_text("Repositories: -")?;
    return Ok(());
  }

  let account_name = status
    .name
    .as_ref()
    .map(|name| format!("{name} (@{})", status.login.as_deref().unwrap_or("")))
    .unwrap_or_else(|| format!("@{}", status.login.as_deref().unwrap_or("unknown")));
  let repo_count = fetch_repository_count().await.unwrap_or(0);

  menu_state.status_item.set_text("🟢 GitHub CLI: authenticated")?;
  menu_state
    .endpoint_item
    .set_text(&format!("127.0.0.1:{} ready for extension requests", app.state::<AppState>().port))?;
  menu_state.account_item.set_text(&format!("Account: {account_name}"))?;
  menu_state.repos_item.set_text(&format!("Repositories: {repo_count}"))?;
  Ok(())
}

fn ensure_install_item_visible<R: tauri::Runtime>(menu_state: &MenuState<R>) -> tauri::Result<()> {
  let items = menu_state.tray_menu.items()?;
  const INSTALL_ID: &str = "install-gh";
  if items.iter().any(|item| item.id().as_ref() == INSTALL_ID) {
    return Ok(());
  }

  menu_state.tray_menu.insert_items(&[&menu_state.install_item], 4)
}

fn ensure_install_item_hidden<R: tauri::Runtime>(menu_state: &MenuState<R>) -> tauri::Result<()> {
  const INSTALL_ID: &str = "install-gh";
  let items = menu_state.tray_menu.items()?;
  let Some(position) = items.iter().position(|item| item.id().as_ref() == INSTALL_ID) else {
    return Ok(());
  };

  menu_state.tray_menu.remove_at(position).map(|_| ())
}
