# Datasource Fallback Messaging for Sitecore Components

When a component like `RichText` doesn't receive rendered content, there are two distinct root causes editors need to tell apart. This pattern (used in `RichText.tsx`) surfaces a different message and style for each.

## The two cases

| Case | Condition | Meaning |
|------|-----------|---------|
| **No datasource assigned** | `rendering?.dataSource` is empty | The author hasn't picked a content item for this component yet |
| **Restricted / inaccessible datasource** | `rendering?.dataSource` is set, but `fields` didn't resolve | A datasource is assigned, but the current user doesn't have read access to it (or it was deleted) |

## How it's detected

```ts
const hasDatasourceReference = Boolean(rendering?.dataSource); // was a datasource picked?
const hasDatasourceFields = Boolean(fields?.Text);             // did the field data come back?
```

- If `hasDatasourceFields` is true → render the component normally.
- If not, and we're in **Editing mode** → show `NoDataFallback`, choosing the message based on `hasDatasourceReference`.
- If not, and we're in **normal/preview mode** → render `null` (don't show internal errors to site visitors).

## The fallback UI (`NoDataFallback`)

`NoDataFallback` renders one of two styles based on whether a `message` was passed in:

- **No message** (datasource not assigned) → neutral slate box with a generic "requires a datasource item assigned" hint.
- **Message provided** (restricted content) → amber/warning box with the message "This component contains restricted content."

This visual distinction lets editors immediately recognize "I need to pick content" vs. "I need permissions" without reading closely.

## Why check `mode.isEditing`

`useSitecore().page.mode.isEditing` ensures these hints only appear for authors working in the Pages/Editing host — end users on the live site never see raw fallback text; they just get nothing rendered for an empty/inaccessible component.

## Applying this to other components

1. Read `rendering` and `fields` from props.
2. Compute `hasDatasourceReference` and `hasDatasourceFields` as above.
3. Render normal content when fields resolve.
4. Otherwise, in editing mode, render `NoDataFallback` with a `message` only when `hasDatasourceReference` is true.
5. Otherwise return `null`.
