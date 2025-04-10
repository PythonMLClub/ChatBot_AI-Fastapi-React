<div className="results-box">
  <h3>📊 Query Result</h3>
  {entry.result.length > 0 ? (
    <table>
      <thead>
        <tr>
          {Object.keys(entry.result[0]).map((key) => (
            <th key={key}>{key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entry.result.map((row, idx) => (
          <tr key={idx}>
            {Object.values(row).map((value, i) => (
              <td key={i}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="no-results">⚠️ No results found for your query.</p>
  )}
</div>
