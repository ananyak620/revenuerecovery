/* ============================================
   ReviveAI — Table Component
   Reusable data table with pagination & filters
   ============================================ */

const TableComponent = (() => {
  function render({ title, columns, data, rowRenderer, headerActions = '' }) {
    const tableId = `table-${Math.random().toString(36).substring(2, 8)}`;

    const thead = columns.map(c => `<th>${c}</th>`).join('');
    const rows = data.map(item => rowRenderer(item)).join('');

    return `
      <div class="data-table-wrapper" id="${tableId}">
        <div class="data-table-header">
          <h3>${title}</h3>
          <div class="table-actions">${headerActions}</div>
        </div>
        <div class="data-table-scroll">
          <table class="data-table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${rows || '<tr><td colspan="' + columns.length + '" style="text-align: center; padding: 32px; color: var(--text-muted);">No records found</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  return { render };
})();
