interface PageProps {
  title: string
  children?: React.ReactNode
}

/**
 * Shared section page scaffolding: renders a page heading, then content.
 * Each section also receives the breadcrumb + section indicator from the app shell.
 */
export function Page({ title, children }: PageProps) {
  return (
    <section aria-labelledby="page-title">
      <h1 id="page-title">{title}</h1>
      {children}
    </section>
  )
}