// Domain types for the frontend. Source of truth: backend/app/domain (Pydantic).
// Never edit schema.d.ts by hand. Regenerate after changing the models:
//   backend:   .venv\Scripts\python -m scripts.export_schema
//   repo root: npm run gen:domain
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Spec = Schemas["Spec"];
export type ObjectType = Schemas["ObjectType"];
export type FieldDef = Schemas["FieldDef"];
export type FieldType = Schemas["FieldType"];
export type Option = Schemas["Option"];
export type Query = Schemas["Query"];
export type Condition = Schemas["Condition"];
export type Op = Schemas["Op"];
export type Sort = Schemas["Sort"];
export type View = Schemas["View"];
export type Display = Schemas["Display"];
export type Page = Schemas["Page"];
export type Placement = Schemas["Placement"];
export type Rule = Schemas["Rule"];
export type Trigger = Schemas["Trigger"];
export type Action = Schemas["Action"];
export type ActionKind = Schemas["ActionKind"];
export type Journey = Schemas["Journey"];
export type Phase = Schemas["Phase"];
export type Theme = Schemas["Theme"];
export type Tone = Schemas["Tone"];

export type Item = Schemas["Item"];
export type Relation = Schemas["Relation"];
export type Event = Schemas["Event"];
export type EventType = Schemas["EventType"];
export type Origin = Schemas["Origin"];
export type Actor = Schemas["Actor"];
export type ActorKind = Schemas["ActorKind"];
export type Workspace = Schemas["Workspace"];
export type JsonValue = Schemas["JsonValue"];
