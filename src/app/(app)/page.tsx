export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Payload Content Engine</h1>
      <p style={{ marginTop: 12 }}>
        Admin: <a href="/admin">/admin</a>
      </p>
      <p>
        API posts pubblicati: <code>/api/posts?where[status][equals]=published&amp;sort=-publishedAt</code>
      </p>
    </main>
  )
}
