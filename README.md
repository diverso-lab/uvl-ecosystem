# UVL landing page

Landing page for the [Universal Variability Language](https://github.com/Universal-Variability-Language) ecosystem, built with Jekyll and deployed to GitHub Pages through GitHub Actions.

## Run locally (Docker)

Only Docker is needed, no local Ruby:

```bash
docker compose up
```

Open http://localhost:4000. Changes are rebuilt and reloaded automatically.
Gems are cached in `vendor/bundle`, so later starts are fast.

One-off production build into `_site/`:

```bash
docker compose run --rm jekyll sh -c "bundle install && JEKYLL_ENV=production bundle exec jekyll build"
```

## Deploy

1. Push this repository to GitHub (branch `main`).
   Every push to `main` builds and deploys the new version automatically.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The workflow `.github/workflows/pages.yml` builds the site with Jekyll and publishes it.
   It can also be launched by hand from the **Actions** tab.

The workflow passes the right `baseurl` automatically, so the site works both as a
user/organization page (`<org>.github.io`) and as a project page (`<org>.github.io/<repo>`).

## Editing content

Almost all content lives in `_data/`, so most updates do not touch HTML:

| File | Content |
|------|---------|
| `_data/tools.yml` | Ecosystem tools, grouped by what the visitor wants to do |
| `_data/repos.yml` | Repositories of the organization (product vs. academic) |
| `_data/publications.yml` | "How to cite" paper, BibTeX and publication list |
| `_data/team.yml` | Core team by institution and contributors |
| `_data/timeline.yml` | Project milestones |
| `_includes/examples/*.uvl` | UVL code samples shown on the page |

Stars, last push, the latest parser release and open UVLEPs are fetched live from the
GitHub API in the browser (cached for one hour per visitor); the YAML values are the fallback.

## Contact form

GitHub Pages only serves static files, so form submissions need an external backend.
Create a form on [Formspree](https://formspree.io) (or Getform, Basin…) and paste the
endpoint in `_config.yml`:

```yaml
contact:
  form_endpoint: "https://formspree.io/f/xxxxxxx"
```

While `form_endpoint` is empty the form opens the visitor's mail client addressed to
`contact.fallback_email`, or shows a notice if that is empty too. The form includes a
honeypot field (`_gotcha`) against spam.
