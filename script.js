document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const expenseForm = document.getElementById('expense-form');
    const dateInput = document.getElementById('date');
    const categoryInput = document.getElementById('category');
    const amountInput = document.getElementById('amount');
    const memoInput = document.getElementById('memo');
    const expenseList = document.getElementById('expense-list');
    const totalAmountDisplay = document.getElementById('total-amount');
    const categorySummary = document.getElementById('category-summary');
    const emptyState = document.getElementById('empty-state');
    const exportBtn = document.getElementById('export-btn');
    const toast = document.getElementById('toast');

    // State
    let expenses = [];

    // Configuration
    // TODO: ユーザー様、ここにデプロイしたGASのウェブアプリURLを貼り付けてください
    const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwj6tv17OOulzXM8CmLVNxwNCbBgcMqPCw5az0lwFdXiEOloY3lEJmw2-YQHKfLisU/exec';

    // Initialize
    init();

    function init() {
        // Set default date to today
        dateInput.valueAsDate = new Date();

        // Load data
        loadExpenses();

        // Render
        renderAll();
    }

    // Event Listeners
    expenseForm.addEventListener('submit', handleAddExpense);
    expenseList.addEventListener('click', handleDeleteExpense);
    exportBtn.addEventListener('click', handleExport);

    // Handlers
    function handleAddExpense(e) {
        e.preventDefault();

        const newExpense = {
            id: Date.now(),
            date: dateInput.value,
            category: categoryInput.value,
            amount: parseInt(amountInput.value),
            memo: memoInput.value.trim()
        };

        expenses.push(newExpense);
        saveExpenses();
        renderAll();

        // Reset form but keep date
        const currentDate = dateInput.value;
        expenseForm.reset();
        dateInput.value = currentDate;

        showToast('支出を記録しました', 'success');
    }

    function handleDeleteExpense(e) {
        if (e.target.closest('.btn-delete')) {
            const btn = e.target.closest('.btn-delete');
            const id = parseInt(btn.dataset.id);

            if (confirm('この記録を削除してもよろしいですか？')) {
                expenses = expenses.filter(expense => expense.id !== id);
                saveExpenses();
                renderAll();
                showToast('支出を削除しました', 'success');
            }
        }
    }

    async function handleExport() {
        if (!GAS_API_URL) {
            alert('GASのURLが設定されていません。script.jsのGAS_API_URLを設定してください。');
            return;
        }

        const confirmSync = confirm('Google Spreadsheetへデータを同期しますか？');

        if (confirmSync) {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 同期中...';

            try {
                // Send data to GAS
                // We send the whole list, backend handles duplicates
                const response = await fetch(GAS_API_URL, {
                    method: 'POST',
                    mode: 'cors', // Important for cross-origin requests
                    headers: {
                        'Content-Type': 'text/plain' // 'application/json' triggers preflight issues sometimes in GAS
                    },
                    body: JSON.stringify({ expenses: expenses })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    showToast(`同期完了: ${result.added}件追加しました`, 'success');
                    console.log('Sync result:', result);
                } else {
                    throw new Error(result.message || 'Unknown error');
                }

            } catch (error) {
                showToast('同期に失敗しました: ' + error.message, 'error');
                console.error('Sync error:', error);
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 同期';
            }
        }
    }

    // Core Logic
    function saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }

    function loadExpenses() {
        const stored = localStorage.getItem('expenses');
        if (stored) {
            expenses = JSON.parse(stored);
        }
    }

    function renderAll() {
        renderExpenseList();
        renderSummary();
    }

    function renderExpenseList() {
        expenseList.innerHTML = '';

        if (expenses.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // Sort by date (newest first)
        const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedExpenses.forEach(expense => {
            const tr = document.createElement('tr');
            tr.className = 'expense-row';
            tr.innerHTML = `
                <td>${formatDate(expense.date)}</td>
                <td><span class="category-badge">${expense.category}</span></td>
                <td>${expense.memo || '-'}</td>
                <td class="col-amount">¥${expense.amount.toLocaleString()}</td>
                <td>
                    <button class="btn-delete" data-id="${expense.id}" title="削除">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            expenseList.appendChild(tr);
        });
    }

    function renderSummary() {
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalAmountDisplay.textContent = `¥${total.toLocaleString()}`;

        // Calculate category totals
        const categoryTotals = expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        // Sort categories by amount (descending)
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a);

        categorySummary.innerHTML = '';

        if (sortedCategories.length === 0) {
            categorySummary.innerHTML = '<p class="text-muted" style="text-align:center; font-size:0.9rem;">データがありません</p>';
            return;
        }

        sortedCategories.forEach(([category, amount]) => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `
                <span class="cat-name">
                    <i class="fa-solid fa-tag" style="color: var(--primary-color); font-size: 0.8rem;"></i>
                    ${category}
                </span>
                <span class="cat-amount">¥${amount.toLocaleString()}</span>
            `;
            categorySummary.appendChild(div);
        });
    }

    // Utilities
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
    }

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast ${type} show`;

        // Add icon based on type
        const icon = document.createElement('i');
        if (type === 'success') {
            icon.className = 'fa-solid fa-check-circle';
        } else {
            icon.className = 'fa-solid fa-exclamation-circle';
        }
        toast.prepend(icon);

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
