#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;

use axum::extract::{Path, Request, State};
use axum::http::{header, HeaderValue, Method, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{ActivationPolicy, Manager, WindowEvent};
use tokio::process::Command;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tower_http::cors::CorsLayer;

const DEFAULT_PORT: u16 = 47321;

#[derive(Clone)]
struct AppState {
  port: u16,
  auth: Arc<RwLock<AuthState>>,
  app_handle: Option<tauri::AppHandle>,
}

#[derive(Default)]
struct AuthState {
  token: Option<String>,
}

struct MenuState<R: tauri::Runtime> {
  tray_menu: Menu<R>,
  status_item: MenuItem<R>,
  endpoint_item: MenuItem<R>,
  token_item: MenuItem<R>,
  account_item: MenuItem<R>,
  repos_item: MenuItem<R>,
  install_item: MenuItem<R>,
  login_item: MenuItem<R>,
  upload_settings_item: MenuItem<R>,
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

#[derive(Serialize)]
struct LabelRecord {
  name: String,
  color: String,
  description: Option<String>,
}

#[derive(Serialize)]
struct RepositoryLabelsResponse {
  labels: Vec<LabelRecord>,
}

#[derive(Deserialize)]
struct ApiLabel {
  name: String,
  color: String,
  description: Option<String>,
}

#[derive(Serialize)]
struct TokenStatusResponse {
  authenticated: bool,
  token_preview: Option<String>,
}

// Upload script types
#[derive(Deserialize)]
struct UploadFileRequest {
  filename: String,
  mime_type: String,
  data: String, // Base64 encoded
}

#[derive(Serialize)]
struct UploadFileResponse {
  url: String,
}

#[derive(Deserialize)]
struct UploadTestRequest {
  script: String,
}

#[derive(Serialize)]
struct UploadTestResult {
  success: bool,
  url: Option<String>,
  error: Option<String>,
}

#[derive(Serialize)]
struct UploadTestResponse {
  png: UploadTestResult,
  webm: UploadTestResult,
  preview: Option<String>,
}

#[derive(Serialize)]
struct UploadScriptResponse {
  script: String,
  configured: bool,
  enabled: bool,
}

#[derive(Deserialize)]
struct SaveUploadScriptRequest {
  script: String,
  #[serde(default)]
  enabled: Option<bool>,
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
      let state = AppState {
        port,
        auth: Arc::new(RwLock::new(AuthState::default())),
        app_handle: None,
      };
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
      let token_item = MenuItem::with_id(app, "token-line", "Token: loading...", false, None::<&str>)?;
      let account_item = MenuItem::with_id(app, "account-line", "Account: -", false, None::<&str>)?;
      let repos_item = MenuItem::with_id(app, "repos-line", "Repositories: -", false, None::<&str>)?;
      let install_item = MenuItem::with_id(app, "install-gh", "Install gh from cli.github.com", true, None::<&str>)?;
      let separator = PredefinedMenuItem::separator(app)?;
      let copy_token_item = MenuItem::with_id(app, "copy-token", "📋 Copy Token", true, None::<&str>)?;
      let rotate_token_item = MenuItem::with_id(app, "rotate-token", "🔄 Rotate Token", true, None::<&str>)?;
      let separator2 = PredefinedMenuItem::separator(app)?;
      let upload_settings_item = MenuItem::with_id(app, "upload-settings", "📤 Upload Script Settings", true, None::<&str>)?;
      let separator3 = PredefinedMenuItem::separator(app)?;
      let refresh_item = MenuItem::with_id(app, "refresh-status", "Refresh Status", true, None::<&str>)?;
      let login_item = MenuItem::with_id(app, "login-terminal", "Login in Terminal", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit-helper", "Quit Tossue Helper", true, None::<&str>)?;

      tray_menu.append_items(&[
        &status_item,
        &endpoint_item,
        &token_item,
        &account_item,
        &repos_item,
        &install_item,
        &separator,
        &copy_token_item,
        &rotate_token_item,
        &separator2,
        &upload_settings_item,
        &separator3,
        &refresh_item,
        &login_item,
        &quit_item,
      ])?;

      app.manage(MenuState {
        tray_menu: tray_menu.clone(),
        status_item: status_item.clone(),
        endpoint_item: endpoint_item.clone(),
        token_item: token_item.clone(),
        account_item: account_item.clone(),
        repos_item: repos_item.clone(),
        install_item: install_item.clone(),
        login_item: login_item.clone(),
        upload_settings_item: upload_settings_item.clone(),
      });

      let tray_icon = app.default_window_icon().cloned();
      let mut tray_builder = TrayIconBuilder::with_id("tossue-helper")
        .menu(&tray_menu)
        .tooltip("Tossue Helper")
        .icon_as_template(true)
        .menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "status-line" | "endpoint-line" | "token-line" => {}
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
          "copy-token" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
              let state = handle.state::<AppState>();
              let auth = state.auth.read().await;
              if let Some(ref token) = auth.token {
                if let Ok(mut clipboard) = arboard::Clipboard::new() {
                  let _ = clipboard.set_text(token.clone());
                }
              }
            });
          }
          "rotate-token" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
              let state = handle.state::<AppState>();
              let new_token = generate_token();
              {
                let mut auth = state.auth.write().await;
                auth.token = Some(new_token.clone());
              }
              let _ = save_token(&new_token).await;
              let _ = update_token_menu(&handle).await;
              eprintln!("[AUTH] Token rotated");
            });
          }
          "refresh-status" => {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
              let _ = refresh_menu_state(&handle).await;
            });
          }
          "upload-settings" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
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

      let server_handle = app.handle().clone();
      let mut server_state = state.clone();
      server_state.app_handle = Some(server_handle);
      tauri::async_runtime::spawn(async move {
        if let Err(error) = run_http_server(server_state).await {
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
  // Load or generate token on startup
  let token = load_or_create_token().await;
  {
    let mut auth = state.auth.write().await;
    auth.token = Some(token);
  }

  // Update tray menu with token preview
  if let Some(ref handle) = state.app_handle {
    let _ = update_token_menu(handle).await;
  }

  // Public routes (no auth required)
  // Upload script endpoints are public since they're only accessible from localhost UI
  let public_routes = Router::new()
    .route("/health", get(health))
    .route("/auth/status", get(auth_status))
    .route("/upload/test", post(upload_test))
    .route("/upload/script", get(get_upload_script_handler))
    .route("/upload/script", axum::routing::put(save_upload_script_handler))
    .with_state(state.clone());

  // Protected routes (auth required)
  let protected_routes = Router::new()
    .route("/github/status", get(github_status))
    .route("/github/login", post(github_login))
    .route("/github/repositories", get(github_repositories))
    .route("/github/repos/:owner/:repo/labels", get(repository_labels))
    .route("/issues", post(create_issue))
    .route("/upload/file", post(upload_file))
    .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
    .with_state(state.clone());

  let cors = CorsLayer::new()
    .allow_origin("*".parse::<HeaderValue>().unwrap())
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
    .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

  let router = Router::new()
    .merge(public_routes)
    .merge(protected_routes)
    .layer(cors);

  let addr = SocketAddr::from(([127, 0, 0, 1], state.port));
  let listener = tokio::net::TcpListener::bind(addr)
    .await
    .map_err(|error| format!("failed to bind helper server: {error}"))?;

  axum::serve(listener, router)
    .await
    .map_err(|error| format!("helper server crashed: {error}"))
}

async fn auth_middleware(
  State(state): State<AppState>,
  request: Request,
  next: Next,
) -> Response {
  let auth_header = request
    .headers()
    .get(header::AUTHORIZATION)
    .and_then(|value| value.to_str().ok());

  let provided_token = auth_header.and_then(|header| header.strip_prefix("Bearer "));

  let auth = state.auth.read().await;
  let is_valid = match (&auth.token, provided_token) {
    (Some(expected), Some(provided)) => expected == provided,
    _ => false,
  };
  drop(auth);

  if is_valid {
    next.run(request).await
  } else {
    (
      StatusCode::UNAUTHORIZED,
      Json(ErrorResponse {
        error: "Unauthorized. Copy the token from Tossue Helper tray menu and paste it in the extension settings.".into(),
      }),
    )
      .into_response()
  }
}

async fn auth_status(State(state): State<AppState>) -> Json<TokenStatusResponse> {
  let auth = state.auth.read().await;
  let has_token = auth.token.is_some();
  let token_preview = auth.token.as_ref().map(|t| {
    if t.len() > 8 {
      format!("{}...{}", &t[..4], &t[t.len()-4..])
    } else {
      t.clone()
    }
  });

  Json(TokenStatusResponse {
    authenticated: has_token,
    token_preview,
  })
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

async fn repository_labels(
  Path((owner, repo)): Path<(String, String)>,
) -> Result<Json<RepositoryLabelsResponse>, (StatusCode, Json<ErrorResponse>)> {
  let endpoint = format!("repos/{owner}/{repo}/labels?per_page=100");
  let value = gh_api_json(&[&endpoint]).await.map_err(bad_gateway_error)?;
  let api_labels: Vec<ApiLabel> = serde_json::from_value(value).map_err(internal_error)?;

  Ok(Json(RepositoryLabelsResponse {
    labels: api_labels
      .into_iter()
      .map(|label| LabelRecord {
        name: label.name,
        color: label.color,
        description: label.description,
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

// Upload script endpoints

async fn upload_file(
  Json(payload): Json<UploadFileRequest>,
) -> Result<Json<UploadFileResponse>, (StatusCode, Json<ErrorResponse>)> {
  // Check if upload is enabled
  if !load_upload_script_enabled().await {
    return Err((
      StatusCode::BAD_REQUEST,
      Json(ErrorResponse {
        error: "Upload script is disabled".into(),
      }),
    ));
  }

  // Decode base64 data
  let data = base64_decode(&payload.data).map_err(|e| {
    (
      StatusCode::BAD_REQUEST,
      Json(ErrorResponse {
        error: format!("Invalid base64 data: {e}"),
      }),
    )
  })?;

  // Write to temp file
  let file_path = write_temp_upload_file(&payload.filename, &data)
    .await
    .map_err(internal_error)?;

  // Run upload script
  let result = run_upload_script(&file_path, &payload.filename, &payload.mime_type).await;

  // Clean up temp file
  let _ = tokio::fs::remove_file(&file_path).await;

  let url = result.map_err(bad_gateway_error)?;
  Ok(Json(UploadFileResponse { url }))
}

async fn upload_test(
  Json(payload): Json<UploadTestRequest>,
) -> Result<Json<UploadTestResponse>, (StatusCode, Json<ErrorResponse>)> {
  // Sample PNG: 1x1 transparent pixel
  let sample_png: &[u8] = &[
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82,
  ];

  // Sample WebM: minimal valid WebM file header
  let sample_webm: &[u8] = &[
    0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81, 0x01, 0x42, 0xF2, 0x81,
    0x04, 0x42, 0xF3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, 0x42, 0x87, 0x81, 0x02,
    0x42, 0x85, 0x81, 0x02,
  ];

  // Test PNG upload
  let png_result = test_upload_with_script(&payload.script, sample_png, "test.png", "image/png").await;

  // Test WebM upload (only if PNG succeeded)
  let webm_result = if png_result.success {
    test_upload_with_script(&payload.script, sample_webm, "test.webm", "video/webm").await
  } else {
    UploadTestResult {
      success: false,
      url: None,
      error: Some("Skipped (PNG upload failed)".into()),
    }
  };

  // Generate preview if both succeeded
  let preview = if png_result.success && webm_result.success {
    Some(format!(
      "## Attachments\n![test.png]({})\n[test.webm]({})",
      png_result.url.as_deref().unwrap_or(""),
      webm_result.url.as_deref().unwrap_or("")
    ))
  } else {
    None
  };

  Ok(Json(UploadTestResponse {
    png: png_result,
    webm: webm_result,
    preview,
  }))
}

async fn test_upload_with_script(
  script: &str,
  data: &[u8],
  filename: &str,
  mime_type: &str,
) -> UploadTestResult {
  // Write temp file
  let file_path = match write_temp_upload_file(filename, data).await {
    Ok(path) => path,
    Err(e) => {
      return UploadTestResult {
        success: false,
        url: None,
        error: Some(e),
      };
    }
  };

  // Run script
  let result = run_upload_script_with_content(script, &file_path, filename, mime_type).await;

  // Clean up
  let _ = tokio::fs::remove_file(&file_path).await;

  match result {
    Ok(url) => UploadTestResult {
      success: true,
      url: Some(url),
      error: None,
    },
    Err(e) => UploadTestResult {
      success: false,
      url: None,
      error: Some(e),
    },
  }
}

async fn get_upload_script_handler() -> Result<Json<UploadScriptResponse>, (StatusCode, Json<ErrorResponse>)> {
  let script = load_upload_script().await.map_err(internal_error)?;
  let enabled = load_upload_script_enabled().await;
  let configured = !script.trim().is_empty();
  Ok(Json(UploadScriptResponse { script, configured, enabled }))
}

async fn save_upload_script_handler(
  State(state): State<AppState>,
  Json(payload): Json<SaveUploadScriptRequest>,
) -> Result<Json<ActionResponse>, (StatusCode, Json<ErrorResponse>)> {
  save_upload_script(&payload.script)
    .await
    .map_err(internal_error)?;

  // Save enabled state if provided
  if let Some(enabled) = payload.enabled {
    save_upload_script_enabled(enabled)
      .await
      .map_err(internal_error)?;
  }

  // Update tray menu icon
  if let Some(ref handle) = state.app_handle {
    let _ = update_upload_menu(handle).await;
  }

  Ok(Json(ActionResponse {
    ok: true,
    message: "Upload script saved".into(),
  }))
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
  // Handle data URL format
  let data = if input.starts_with("data:") {
    input
      .split(',')
      .nth(1)
      .ok_or("Invalid data URL format")?
  } else {
    input
  };

  use base64::Engine;
  base64::engine::general_purpose::STANDARD
    .decode(data)
    .map_err(|e| format!("Base64 decode error: {e}"))
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

  // Update upload script menu
  let _ = update_upload_menu(app).await;

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

// Upload script management functions

fn get_upload_script_path() -> PathBuf {
  let config_dir = dirs::config_dir()
    .or_else(dirs::home_dir)
    .unwrap_or_else(|| PathBuf::from("."));
  config_dir.join("tossue").join("upload-script")
}

fn get_upload_script_enabled_path() -> PathBuf {
  let config_dir = dirs::config_dir()
    .or_else(dirs::home_dir)
    .unwrap_or_else(|| PathBuf::from("."));
  config_dir.join("tossue").join("upload-script-enabled")
}

async fn load_upload_script_enabled() -> bool {
  let path = get_upload_script_enabled_path();
  match tokio::fs::read_to_string(&path).await {
    Ok(content) => content.trim() == "true",
    Err(_) => false, // Default to disabled
  }
}

async fn save_upload_script_enabled(enabled: bool) -> Result<(), String> {
  let path = get_upload_script_enabled_path();

  // Ensure parent directory exists
  if let Some(parent) = path.parent() {
    tokio::fs::create_dir_all(parent)
      .await
      .map_err(|e| format!("failed to create config directory: {e}"))?;
  }

  tokio::fs::write(&path, if enabled { "true" } else { "false" })
    .await
    .map_err(|e| format!("failed to write upload script enabled state: {e}"))?;

  Ok(())
}

async fn update_upload_menu<R: tauri::Runtime>(handle: &tauri::AppHandle<R>) -> Result<(), tauri::Error> {
  let script = load_upload_script().await.unwrap_or_default();
  let enabled = load_upload_script_enabled().await;
  let configured = !script.trim().is_empty();

  let icon = if configured && enabled {
    "✅"
  } else if configured {
    "📤"
  } else {
    "📤"
  };

  let text = format!("{} Upload Script Settings", icon);

  let menu_state = handle.state::<MenuState<R>>();
  menu_state.upload_settings_item.set_text(&text)
}

async fn load_upload_script() -> Result<String, String> {
  let path = get_upload_script_path();
  match tokio::fs::read_to_string(&path).await {
    Ok(script) => Ok(script),
    Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
    Err(e) => Err(format!("failed to read upload script: {e}")),
  }
}

async fn save_upload_script(script: &str) -> Result<(), String> {
  let path = get_upload_script_path();

  // Ensure parent directory exists
  if let Some(parent) = path.parent() {
    tokio::fs::create_dir_all(parent)
      .await
      .map_err(|e| format!("failed to create config directory: {e}"))?;
  }

  tokio::fs::write(&path, script)
    .await
    .map_err(|e| format!("failed to write upload script: {e}"))?;

  // Set file permissions to owner-only (Unix)
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    let permissions = std::fs::Permissions::from_mode(0o600);
    let _ = std::fs::set_permissions(&path, permissions);
  }

  Ok(())
}

async fn write_temp_script(script: &str) -> Result<PathBuf, String> {
  let mut path = env::temp_dir();
  path.push(format!("tossue-upload-script-{}", unique_suffix()));
  tokio::fs::write(&path, script)
    .await
    .map_err(|e| format!("failed to write temporary script: {e}"))?;

  // Set executable permission (Unix)
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    let permissions = std::fs::Permissions::from_mode(0o700);
    std::fs::set_permissions(&path, permissions)
      .map_err(|e| format!("failed to set script permissions: {e}"))?;
  }

  Ok(path)
}

async fn write_temp_upload_file(filename: &str, data: &[u8]) -> Result<PathBuf, String> {
  let mut path = env::temp_dir();
  let extension = std::path::Path::new(filename)
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("");
  let temp_filename = if extension.is_empty() {
    format!("tossue-upload-{}", unique_suffix())
  } else {
    format!("tossue-upload-{}.{}", unique_suffix(), extension)
  };
  path.push(temp_filename);

  tokio::fs::write(&path, data)
    .await
    .map_err(|e| format!("failed to write temporary upload file: {e}"))?;

  Ok(path)
}

async fn run_upload_script_with_content(
  script: &str,
  file_path: &std::path::Path,
  filename: &str,
  mime_type: &str,
) -> Result<String, String> {
  if script.trim().is_empty() {
    return Err("Upload script is not configured".into());
  }

  // Write script to temp file
  let script_path = write_temp_script(script).await?;

  // Run script with timeout
  let output = tokio::time::timeout(
    Duration::from_secs(60),
    Command::new(&script_path)
      .env("TOSSUE_FILE_PATH", file_path)
      .env("TOSSUE_FILENAME", filename)
      .env("TOSSUE_MIME_TYPE", mime_type)
      .stdout(Stdio::piped())
      .stderr(Stdio::piped())
      .output(),
  )
  .await
  .map_err(|_| "Upload script timed out after 60 seconds".to_string())?
  .map_err(|e| format!("failed to run upload script: {e}"))?;

  // Clean up script file
  let _ = tokio::fs::remove_file(&script_path).await;

  if !output.status.success() {
    return Err(format!(
      "Script exited with code {}: {}",
      output.status.code().unwrap_or(-1),
      stderr_text(&output.stderr)
    ));
  }

  // Get first line of stdout as URL
  let url = String::from_utf8_lossy(&output.stdout)
    .lines()
    .next()
    .map(|s| s.trim().to_string())
    .filter(|s| !s.is_empty())
    .ok_or("Upload script produced no output")?;

  Ok(url)
}

async fn run_upload_script(
  file_path: &std::path::Path,
  filename: &str,
  mime_type: &str,
) -> Result<String, String> {
  let script = load_upload_script().await?;
  run_upload_script_with_content(&script, file_path, filename, mime_type).await
}

// Token management functions

fn get_token_file_path() -> PathBuf {
  let config_dir = dirs::config_dir()
    .or_else(dirs::home_dir)
    .unwrap_or_else(|| PathBuf::from("."));
  config_dir.join("tossue").join("token")
}

fn generate_token() -> String {
  rand::thread_rng()
    .sample_iter(rand::distributions::Alphanumeric)
    .take(48)
    .map(char::from)
    .collect()
}

async fn load_or_create_token() -> String {
  let path = get_token_file_path();

  // Try to load existing token
  if let Ok(token) = tokio::fs::read_to_string(&path).await {
    let token = token.trim().to_string();
    if !token.is_empty() {
      eprintln!("[AUTH] Loaded existing token from {:?}", path);
      return token;
    }
  }

  // Generate new token
  let token = generate_token();
  let _ = save_token(&token).await;
  eprintln!("[AUTH] Generated new token and saved to {:?}", path);
  token
}

async fn save_token(token: &str) -> Result<(), String> {
  let path = get_token_file_path();

  // Ensure parent directory exists
  if let Some(parent) = path.parent() {
    tokio::fs::create_dir_all(parent)
      .await
      .map_err(|e| format!("failed to create config directory: {e}"))?;
  }

  tokio::fs::write(&path, token)
    .await
    .map_err(|e| format!("failed to write token file: {e}"))?;

  // Set file permissions to owner-only (Unix)
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    let permissions = std::fs::Permissions::from_mode(0o600);
    let _ = std::fs::set_permissions(&path, permissions);
  }

  Ok(())
}

async fn update_token_menu<R: tauri::Runtime>(handle: &tauri::AppHandle<R>) -> tauri::Result<()> {
  let state = handle.state::<AppState>();
  let auth = state.auth.read().await;

  let token_text = auth.token.as_ref().map(|t| {
    if t.len() > 8 {
      format!("🔑 Token: {}...{}", &t[..4], &t[t.len()-4..])
    } else {
      format!("🔑 Token: {}", t)
    }
  }).unwrap_or_else(|| "🔑 Token: none".to_string());

  let menu_state = handle.state::<MenuState<R>>();
  menu_state.token_item.set_text(&token_text)
}
