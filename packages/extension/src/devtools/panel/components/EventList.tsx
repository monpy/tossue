import { useComputed } from "@preact/signals";
import { events, DebuggerEvent } from "../store/signals";

function EventItem({ event }: { event: DebuggerEvent }) {
  const kindLabel = {
    network: "NET",
    runtime: "ERR",
    log: "LOG",
  }[event.kind];

  return (
    <li class={`event-item ${event.level || ""}`}>
      <span class="event-kind">{kindLabel}</span>
      <span class="event-text">{event.text}</span>
    </li>
  );
}

export function EventList() {
  const eventList = useComputed(() => events.value);

  if (eventList.value.length === 0) {
    return (
      <section class="card">
        <p class="empty-state">No events captured yet.</p>
      </section>
    );
  }

  return (
    <section class="card">
      <ul class="list bullet">
        {eventList.value.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}
