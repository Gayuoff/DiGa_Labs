import { Check } from "lucide-react";
import type { FieldDef, Item } from "@/domain";
import { makeQuery, useItem, useQuery, useRelations, useStore } from "@/store";
import { Badge } from "./Badge";
import { formatDay } from "./dates";
import { updateIfLive } from "./draft";
import { DraftText } from "./DraftText";
import { OptionPicker } from "./OptionPicker";

const INPUT =
  "w-full min-w-0 rounded bg-transparent px-1.5 py-1 text-sm text-ink outline-none hover:bg-subtle focus:bg-subtle";

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/** Relations of a relation field: the field key is the relation kind, the item is its source. */
function useFieldLinks(item: Item, field: FieldDef) {
  return useRelations(item.id).filter((r) => r.kind === field.key && r.fromId === item.id);
}

/** A field value shown compactly, for cards and list rows. Empty values render nothing. */
export function FieldValue({ item, field }: { item: Item; field: FieldDef }) {
  const value = item.data[field.key];
  switch (field.type) {
    case "select": {
      const option = field.options.find((o) => o.key === value);
      return option ? <Badge color={option.color}>{option.label}</Badge> : null;
    }
    case "multi_select":
      return (
        <>
          {strings(value).map((key) => {
            const option = field.options.find((o) => o.key === key);
            return option ? (
              <Badge key={key} color={option.color}>
                {option.label}
              </Badge>
            ) : null;
          })}
        </>
      );
    case "date":
    case "datetime":
      return typeof value === "string" && value ? (
        <span className="whitespace-nowrap text-xs text-muted" title={value}>
          {formatDay(value)}
        </span>
      ) : null;
    case "checkbox":
      return value === true ? <Check size={13} className="text-accent" aria-label={field.label} /> : null;
    case "number":
      return typeof value === "number" ? (
        <span className="text-xs tabular-nums text-muted">{value}</span>
      ) : null;
    case "relation":
      return <RelationValue item={item} field={field} />;
    case "url":
      return typeof value === "string" && value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          onPointerDown={(event) => event.stopPropagation()}
          className="truncate text-xs text-accent underline-offset-2 hover:underline"
        >
          {hostname(value)}
        </a>
      ) : null;
    case "text":
    case "long_text":
      return typeof value === "string" && value ? (
        <span className="truncate text-xs text-muted">{value}</span>
      ) : null;
    case "file":
    case "ink":
      return null;
  }
}

function RelationValue({ item, field }: { item: Item; field: FieldDef }) {
  const links = useFieldLinks(item, field);
  return (
    <>
      {links.map((link) => (
        <RelatedTitle key={link.id} id={link.toId} />
      ))}
    </>
  );
}

function RelatedTitle({ id }: { id: string }) {
  const item = useItem(id);
  if (!item || item.deletedAt !== null) return null;
  return <Badge>{item.title || "Untitled"}</Badge>;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A field value as an editor, for table cells and the doc view. Saves through the store. */
export function FieldInput({ item, field }: { item: Item; field: FieldDef }) {
  const store = useStore();
  const value = item.data[field.key];
  const save = (next: unknown) => updateIfLive(store, item.id, { data: { [field.key]: next } });

  switch (field.type) {
    case "select":
      return (
        <OptionPicker
          options={field.options}
          value={typeof value === "string" ? [value] : []}
          multi={false}
          ariaLabel={field.label}
          onChange={(next) => save(next[0] ?? null)}
        />
      );
    case "multi_select":
      return (
        <OptionPicker
          options={field.options}
          value={strings(value)}
          multi
          ariaLabel={field.label}
          onChange={(next) => save(next.length > 0 ? next : null)}
        />
      );
    case "date":
      return (
        <input
          type="date"
          aria-label={field.label}
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={(event) => save(event.target.value || null)}
          className={INPUT}
        />
      );
    case "datetime":
      return (
        <input
          type="datetime-local"
          aria-label={field.label}
          value={typeof value === "string" ? value.slice(0, 16) : ""}
          onChange={(event) => save(event.target.value || null)}
          className={INPUT}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          aria-label={field.label}
          checked={value === true}
          onChange={(event) => save(event.target.checked)}
          className="mx-1.5 h-4 w-4"
          style={{ accentColor: "var(--accent)" }}
        />
      );
    case "number":
      return (
        <DraftText
          type="number"
          ariaLabel={field.label}
          value={typeof value === "number" ? String(value) : ""}
          onSave={(text) => {
            const next = text.trim() === "" ? null : Number(text);
            if (next === null || Number.isFinite(next)) save(next);
          }}
          className={`${INPUT} tabular-nums`}
        />
      );
    case "relation":
      return <RelationInput item={item} field={field} />;
    case "url":
    case "text":
    case "long_text":
      return (
        <DraftText
          type={field.type === "url" ? "url" : "text"}
          ariaLabel={field.label}
          value={typeof value === "string" ? value : ""}
          onSave={(text) => save(text || null)}
          className={INPUT}
        />
      );
    case "file":
    case "ink":
      return <span className="px-1.5 text-xs text-muted">Not editable yet</span>;
  }
}

function RelationInput({ item, field }: { item: Item; field: FieldDef }) {
  const store = useStore();
  const links = useFieldLinks(item, field);
  const targets = useQuery(
    makeQuery(field.targetType ?? "", { sort: [{ field: "title", dir: "asc" }] }),
  );
  return (
    <OptionPicker
      options={targets.map((t) => ({ key: t.id, label: t.title || "Untitled", color: null }))}
      value={links.map((link) => link.toId)}
      multi={false}
      ariaLabel={field.label}
      onChange={(next) =>
        store.transact(() => {
          for (const link of links) store.unlink(link.id);
          if (next[0]) store.link(field.key, item.id, next[0]);
        })
      }
    />
  );
}
