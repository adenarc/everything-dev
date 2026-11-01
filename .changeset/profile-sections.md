---
"everything-dev": patch
---

Auth plugin Settings → Profile: child apps can add their own sections through the `profile` auth variable. Each entry in `profile.sections` has an `id`, `title`, optional `description` and a `url`, an app path that returns `{ items, empty?, incomplete?, link? }`. The page renders each section below the profile fields in config order. A section that fails to load, or returns an invalid response, shows an error with Retry, and the rest of the page keeps working.
