export default function ListView() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2>📋 List View</h2>
      <p>Browse all your cafes in a sortable list</p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          background: "#f8f9fa",
          border: "2px dashed #dee2e6",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <div>
          <h3>📊 Cafe List Coming Soon</h3>
          <p>This will show a sortable and filterable list of all your cafes</p>
        </div>
      </div>
    </div>
  );
}
