"""Reference specs in wire format (camelCase), as the Architect AI would produce them.

Used by tests today, and as seeds for the offline planner and the preview sandbox later.
"""

STUDENT_SPEC = {
    "name": "Study HQ",
    "theme": {"accent": "#0ea5e9", "tone": "calm"},
    "types": [
        {
            "key": "assignment",
            "label": "Assignment",
            "icon": "book-open",
            "fields": [
                {
                    "key": "status",
                    "label": "Status",
                    "type": "select",
                    "options": [
                        {"key": "todo", "label": "To start", "color": "#94a3b8"},
                        {"key": "doing", "label": "In progress", "color": "#3b82f6"},
                        {"key": "done", "label": "Submitted", "color": "#22c55e"},
                    ],
                },
                {"key": "due", "label": "Due", "type": "date"},
                {
                    "key": "priority",
                    "label": "Priority",
                    "type": "select",
                    "options": [
                        {"key": "high", "label": "High", "color": "#ef4444"},
                        {"key": "medium", "label": "Medium", "color": "#f59e0b"},
                        {"key": "low", "label": "Low", "color": "#22c55e"},
                    ],
                },
                {"key": "subject", "label": "Subject", "type": "relation", "targetType": "subject"},
            ],
        },
        {
            "key": "subject",
            "label": "Subject",
            "icon": "library",
            "fields": [{"key": "credits", "label": "Credits", "type": "number"}],
        },
        {
            "key": "note",
            "label": "Note",
            "icon": "notebook-pen",
            "fields": [
                {"key": "body", "label": "Body", "type": "long_text"},
                {
                    "key": "tags",
                    "label": "Tags",
                    "type": "multi_select",
                    "options": [
                        {"key": "inbox", "label": "Inbox"},
                        {"key": "exam", "label": "Exam"},
                    ],
                },
            ],
        },
    ],
    "views": [
        {
            "key": "assignments_board",
            "title": "Assignments",
            "display": "board",
            "query": {"type": "assignment", "sort": [{"field": "due"}]},
            "groupBy": "status",
            "fields": ["due", "priority"],
        },
        {
            "key": "deadlines",
            "title": "Deadline calendar",
            "display": "calendar",
            "query": {"type": "assignment"},
            "dateField": "due",
        },
        {
            "key": "inbox",
            "title": "Inbox",
            "display": "list",
            "query": {
                "type": "note",
                "where": [{"field": "tags", "op": "contains", "value": "inbox"}],
                "sort": [{"field": "created_at", "dir": "desc"}],
            },
        },
        {
            "key": "assignment_table",
            "title": "All assignments",
            "display": "table",
            "query": {"type": "assignment", "sort": [{"field": "due"}]},
            "fields": ["status", "due", "priority", "subject"],
        },
        {
            "key": "notes",
            "title": "Notes",
            "display": "doc",
            "query": {"type": "note", "sort": [{"field": "created_at", "dir": "desc"}]},
        },
    ],
    "pages": [
        {
            "key": "home",
            "title": "Home",
            "icon": "house",
            "blocks": [
                {"view": "assignments_board", "x": 0, "y": 0, "w": 12, "h": 8},
                {"view": "deadlines", "x": 0, "y": 8, "w": 8, "h": 8},
                {"view": "inbox", "x": 8, "y": 8, "w": 4, "h": 8},
            ],
        },
        {
            "key": "planner",
            "title": "Planner",
            "icon": "table-2",
            "blocks": [{"view": "assignment_table", "x": 0, "y": 0, "w": 12, "h": 12}],
        },
        {
            "key": "notes",
            "title": "Notes",
            "icon": "notebook-pen",
            "blocks": [{"view": "notes", "x": 0, "y": 0, "w": 12, "h": 16}],
        },
    ],
    "rules": [
        {
            "key": "submitted_xp",
            "title": "Reward submissions",
            "when": {
                "on": "item.updated",
                "type": "assignment",
                "where": [{"field": "status", "op": "eq", "value": "done"}],
            },
            "then": [{"do": "award", "args": {"points": 50}}],
        }
    ],
}
