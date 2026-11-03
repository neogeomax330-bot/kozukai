const EXPENSE_GROUPS = [
  { label: '毎日の支出', categories: ['食費', '飲み物', '日用品'] },
  { label: '住まい・通信', categories: ['家賃', '水道・電気・ガス', '携帯電話・インターネット'] },
  { label: '移動', categories: ['交通費', '自動車'] },
  { label: '健康・身だしなみ', categories: ['医療費・医薬品', '保険', '衣類・ファッション', 'コスメ'] },
  { label: '趣味・交際', categories: ['本・雑誌', '趣味', '交際費'] },
  { label: 'その他・支払い', categories: ['税金', 'カード支払', 'その他'] }
];
const CATEGORIES = {
  expense: EXPENSE_GROUPS.flatMap(group => group.categories),
  income: ['給与', '賞与', '臨時収入', 'お小遣い', 'その他']
};
const CATEGORY_ICONS = {
  食費: '🍙', 日用品: '🧻', 交通費: '🚃', '本・雑誌': '📚',
  '携帯電話・インターネット': '📱', '医療費・医薬品': '💊', 交際費: '🎁',
  '水道・電気・ガス': '💡', 家賃: '🏠', 保険: '🛡️', '衣類・ファッション': '👕',
  コスメ: '💄', 自動車: '🚗', 税金: '🧾', カード支払: '💳', 飲み物: '☕',
  趣味: '🎮', その他: '📦', 給与: '💼', 賞与: '🎉', 臨時収入: '✨',
  お小遣い: '💰'
};
const KEY = 'kozukai.entries', BKEY = 'kozukai.budget';
let entries = JSON.parse(localStorage.getItem(KEY) || '[]');
let budget = Number(localStorage.getItem(BKEY) || 0);
let view = new Date(); view.setDate(1);
let editId = null, entryType = 'expense', category = CATEGORIES.expense[0];
let activeExpenseGroup = 0;

const $ = id => document.getElementById(id);
const yen = n => '¥' + n.toLocaleString('ja-JP');
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const save = () => localStorage.setItem(KEY, JSON.stringify(entries));
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = value => value.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\D/g, '');

function monthEntries() {
  const ym = `${view.getFullYear()}-${pad(view.getMonth() + 1)}`;
  return entries.filter(e => e.date.startsWith(ym));
}

function getType(entry) {
  return entry.type === 'income' ? 'income' : 'expense';
}

function renderList(items) {
  if (!items.length) return '<div class="empty">まだ記録がありません</div>';
  let html = '', last = '';
  for (const entry of items) {
    if (entry.date !== last) {
      last = entry.date;
      const d = new Date(entry.date + 'T00:00');
      html += `<div class="day">${d.getMonth() + 1}/${d.getDate()}(${'日月火水木金土'[d.getDay()]})</div>`;
    }
    const type = getType(entry);
    const sign = type === 'income' ? '+' : '-';
    html += `<button type="button" class="item ${type}" data-id="${entry.id}">
      <span class="ic" aria-hidden="true">${type === 'income' ? '＋' : '●'}</span>
      <span class="t">${esc(entry.cat)}<small>${esc(entry.memo || '')}</small></span>
      <span class="a">${sign}${yen(entry.amount)}</span>
    </button>`;
  }
  return html;
}

function renderReport(items) {
  const totals = {};
  for (const entry of items) {
    if (getType(entry) !== 'income') totals[entry.cat] = (totals[entry.cat] || 0) + entry.amount;
  }
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<div class="empty">今月の支出はありません</div>';
  const max = rows[0][1];
  return rows.map(([name, amount]) =>
    `<div class="report-row"><div><span>${esc(name)}</span><strong>${yen(amount)}</strong></div>
      <div class="bar"><span style="width:${Math.round(amount / max * 100)}%"></span></div></div>`).join('');
}

function render() {
  const ym = `${view.getFullYear()}-${pad(view.getMonth() + 1)}`;
  $('monthLabel').textContent = `${view.getFullYear()}年${view.getMonth() + 1}月`;
  const items = monthEntries().sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const expenses = items.filter(e => getType(e) === 'expense').reduce((sum, e) => sum + e.amount, 0);
  $('total').textContent = yen(expenses);
  $('remain').textContent = budget ? yen(budget - expenses) : '-';
  $('remain').classList.toggle('over', budget > 0 && expenses > budget);
  $('budgetAmount').textContent = budget ? yen(budget) : '未設定';
  $('budgetRemain').textContent = budget ? yen(budget - expenses) : '-';
  $('budgetRemain').classList.toggle('over', budget > 0 && expenses > budget);

  const filter = $('recordFilter').value;
  $('recordsList').innerHTML = renderList(items.filter(e => filter === 'all' || getType(e) === filter));
  const allEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  $('ledgerList').innerHTML = renderList(allEntries);
  $('reportList').innerHTML = renderReport(items);
}

function drawCategories() {
  const renderTile = name =>
    `<button type="button" class="category-tile${name === category ? ' selected' : ''}" data-category="${esc(name)}">
      <span class="category-icon" aria-hidden="true">${CATEGORY_ICONS[name] || '📦'}</span><span>${esc(name)}</span>
    </button>`;
  const groups = $('categoryGroups');
  groups.hidden = entryType !== 'expense';
  if (entryType === 'expense') {
    groups.innerHTML = EXPENSE_GROUPS.map((group, index) =>
      `<button type="button" class="category-group-tab${index === activeExpenseGroup ? ' active' : ''}" role="tab" aria-selected="${index === activeExpenseGroup}" data-group="${index}">${esc(group.label)}</button>`
    ).join('');
    $('cats').innerHTML = EXPENSE_GROUPS[activeExpenseGroup].categories.map(renderTile).join('');
  } else {
    groups.innerHTML = '';
    $('cats').innerHTML = CATEGORIES.income.map(renderTile).join('');
  }
}

function setType(type) {
  entryType = type;
  const options = CATEGORIES[type];
  if (!options.includes(category)) category = options[0];
  if (type === 'expense') {
    const categoryGroup = EXPENSE_GROUPS.findIndex(group => group.categories.includes(category));
    activeExpenseGroup = categoryGroup >= 0 ? categoryGroup : 0;
  }
  document.querySelectorAll('.type-btn').forEach(button => {
    const selected = button.dataset.type === type;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  drawCategories();
}

function setAmount(value) {
  const digitsOnly = digits(value).slice(0, 12);
  $('amount').value = digitsOnly ? Number(digitsOnly).toLocaleString('ja-JP') : '';
}

function openEntry(entry) {
  editId = entry ? entry.id : null;
  setType(entry ? getType(entry) : 'expense');
  const legacyCategories = { '交通': '交通費', '交際': '交際費', '衣類': '衣類・ファッション' };
  category = entry ? (legacyCategories[entry.cat] || entry.cat) : CATEGORIES[entryType][0];
  drawCategories();
  $('amount').value = entry ? Number(entry.amount).toLocaleString('ja-JP') : '';
  $('memo').value = entry ? entry.memo || '' : '';
  $('date').value = entry ? entry.date : today();
  $('deleteEntry').hidden = !entry;
  $('ocrStatus').hidden = true;
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === 'homeView'));
  document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'homeView'));
  $('amount').focus({ preventScroll: true });
}

function editBudget() {
  const value = prompt('今月の予算（円）', budget || '');
  if (value === null) return;
  budget = Number(digits(value)) || 0;
  localStorage.setItem(BKEY, String(budget));
  render();
}

$('cats').onclick = event => {
  const tile = event.target.closest('[data-category]');
  if (!tile) return;
  category = tile.dataset.category;
  drawCategories();
};
$('categoryGroups').onclick = event => {
  const tab = event.target.closest('[data-group]');
  if (!tab) return;
  activeExpenseGroup = Number(tab.dataset.group);
  if (!EXPENSE_GROUPS[activeExpenseGroup].categories.includes(category)) {
    category = EXPENSE_GROUPS[activeExpenseGroup].categories[0];
  }
  drawCategories();
};

document.querySelector('.entry-type').onclick = event => {
  const button = event.target.closest('[data-type]');
  if (button) setType(button.dataset.type);
};

$('amount').oninput = event => setAmount(event.target.value);
document.querySelector('.keypad').onclick = event => {
  const key = event.target.closest('[data-key]');
  if (key) setAmount(($('amount').value.replace(/\D/g, '') + key.dataset.key));
};
$('clearAmount').onclick = () => setAmount('');
$('backspace').onclick = () => setAmount($('amount').value.replace(/\D/g, '').slice(0, -1));
$('memoFocus').onclick = () => $('memo').focus();
$('saveEntry').onclick = () => {
  const amount = Number($('amount').value.replace(/\D/g, ''));
  if (!amount || !$('date').value) {
    alert('金額と日付を入力してください。');
    return;
  }
  const data = { amount, type: entryType, cat: category, memo: $('memo').value.trim(), date: $('date').value };
  if (editId !== null) {
    const existing = entries.find(e => e.id === editId);
    if (existing) Object.assign(existing, data);
  } else {
    entries.push({ id: Date.now(), ...data });
  }
  save();
  editId = null;
  $('deleteEntry').hidden = true;
  setAmount('');
  $('memo').value = '';
  $('date').value = today();
  render();
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === 'recordsView'));
  document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === 'recordsView'));
};

function handleListClick(event) {
  const item = event.target.closest('[data-id]');
  if (!item) return;
  const entry = entries.find(e => e.id === Number(item.dataset.id));
  if (entry) openEntry(entry);
}
$('recordsList').onclick = handleListClick;
$('ledgerList').onclick = handleListClick;
$('deleteEntry').onclick = () => {
  if (!confirm('この記録を削除しますか？')) return;
  entries = entries.filter(entry => entry.id !== editId);
  save();
  editId = null;
  $('deleteEntry').hidden = true;
  render();
};

document.querySelectorAll('.nav-button').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === button.dataset.view));
    document.querySelectorAll('.nav-button').forEach(nav => nav.classList.toggle('active', nav === button));
  };
});

$('recordFilter').onchange = render;
$('prevMonth').onclick = () => { view.setMonth(view.getMonth() - 1); render(); };
$('nextMonth').onclick = () => { view.setMonth(view.getMonth() + 1); render(); };
$('budgetBtn').onclick = editBudget;
$('editBudget').onclick = editBudget;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function parseReceipt(text) {
  const normalized = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[，]/g, ',');
  const num = value => Number(value.replace(/[^\d]/g, ''));
  let amount = 0;
  const totalPattern = /(合\s*計|お?会\s*計|総\s*額|請求|total)[^\d\n]{0,12}[¥￥\\]?\s*([\d,]{2,9})/gi;
  const candidates = [...normalized.matchAll(totalPattern)].map(match => num(match[2]));
  if (candidates.length) amount = Math.max(...candidates);
  else {
    const values = [...normalized.matchAll(/[¥￥\\]\s*([\d,]{2,9})|([\d,]{2,9})\s*円/g)].map(match => num(match[1] || match[2]));
    if (values.length) amount = Math.max(...values);
  }
  const dateMatch = normalized.match(/(20\d{2})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})/);
  const date = dateMatch ? `${dateMatch[1]}-${pad(+dateMatch[2])}-${pad(+dateMatch[3])}` : '';
  const store = normalized.split('\n').map(line => line.trim()).find(line => /[ぁ-んァ-ン一-龥A-Za-z]{3,}/.test(line)) || '';
  return { amount, date, store: store.replace(/\s+/g, '').slice(0, 20) };
}

$('receipt').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const status = $('ocrStatus');
  status.hidden = false;
  status.textContent = 'レシートを読み取り中…';
  try {
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    const { data } = await Tesseract.recognize(file, 'jpn+eng');
    const result = parseReceipt(data.text);
    if (result.amount) setAmount(String(result.amount));
    if (result.date) $('date').value = result.date;
    if (result.store) $('memo').value = result.store;
    status.textContent = result.amount ? '読み取り完了。内容を確認して入力してください。' : '金額を読み取れませんでした。手入力してください。';
  } catch (error) {
    status.textContent = '読み取りに失敗しました。通信環境を確認して手入力してください。';
  }
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
setType(entryType);
$('date').value = today();
render();
