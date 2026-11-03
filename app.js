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
  entryType = 'expense';
  category = CATEGORIES.expense[0];
  activeExpenseGroup = 0;
  setType(entryType);
  $('deleteEntry').hidden = true;
  setAmount('');
  $('memo').value = '';
  $('date').value = today();
  $('ocrStatus').hidden = true;
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
  const normalized = text
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[，]/g, ',')
    .replace(/[￥¥]/g, '¥')
    .replace(/[‐‑‒–—−]/g, '-');
  const num = value => Number(value.replace(/[^\d]/g, ''));
  const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const totalLabel = /合\s*計|お\s*会\s*計|総\s*額|ご\s*請求|請求\s*額|お買上(?:げ)?|お預り|total/i;
  const amountsInLine = line => [...line.matchAll(/(?:¥\s*)?([\d]{1,3}(?:[,\s][\d]{3})+|[\d]{3,9})(?:\s*円)?/g)]
    .map(match => num(match[1])).filter(value => value > 0);
  let amount = 0;
  const labeledCandidates = [];
  for (let i = 0; i < lines.length; i++) {
    if (!totalLabel.test(lines[i].replace(/\s/g, ''))) continue;
    const sameLineAmounts = amountsInLine(lines[i]);
    const candidates = sameLineAmounts.length ? sameLineAmounts : amountsInLine(lines[i + 1] || '');
    labeledCandidates.push(...candidates);
  }
  if (labeledCandidates.length) {
    amount = Math.max(...labeledCandidates);
  } else {
    const currencyCandidates = [...normalized.matchAll(/[¥\\]\s*([\d,]{2,9})|([\d,]{2,9})\s*円/g)]
      .map(match => num(match[1] || match[2])).filter(value => value > 0);
    if (currencyCandidates.length) amount = Math.max(...currencyCandidates);
  }
  let date = '';
  const fullDate = normalized.match(/(20\d{2})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})/);
  const shortDate = normalized.match(/(?:^|\D)(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\D|$)/);
  if (fullDate) {
    date = `${fullDate[1]}-${pad(+fullDate[2])}-${pad(+fullDate[3])}`;
  } else if (shortDate) {
    const month = +shortDate[1], day = +shortDate[2], year = new Date().getFullYear();
    const parsedDate = new Date(year, month - 1, day);
    if (month >= 1 && month <= 12 && parsedDate.getDate() === day) {
      date = `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  const store = lines.find(line => /[ぁ-んァ-ン一-龥A-Za-z]{3,}/.test(line) && !totalLabel.test(line)) || '';
  return { amount, date, store: store.replace(/\s+/g, '').slice(0, 20) };
}

function prepareReceiptImage(file, threshold = false) {
  return createImageBitmap(file).then(bitmap => {
    const maxSide = 2400;
    const scale = Math.min(2, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      throw new Error('画像を処理できませんでした。');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const histogram = new Uint32Array(256);
    for (let i = 0; i < image.data.length; i += 4) {
      const gray = Math.round(image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = gray;
      histogram[gray]++;
    }
    if (threshold) {
      const total = image.data.length / 4;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];
      let backgroundWeight = 0, backgroundSum = 0, maxVariance = 0, cutoff = 180;
      for (let i = 0; i < 256; i++) {
        backgroundWeight += histogram[i];
        if (!backgroundWeight) continue;
        const foregroundWeight = total - backgroundWeight;
        if (!foregroundWeight) break;
        backgroundSum += i * histogram[i];
        const backgroundMean = backgroundSum / backgroundWeight;
        const foregroundMean = (sum - backgroundSum) / foregroundWeight;
        const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
        if (variance > maxVariance) {
          maxVariance = variance;
          cutoff = i;
        }
      }
      for (let i = 0; i < image.data.length; i += 4) {
        const value = image.data[i] < cutoff ? 0 : 255;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      }
    } else {
      let low = 255, high = 0;
      const count = image.data.length / 4;
      const lowTarget = count * 0.02, highTarget = count * 0.98;
      let cumulative = 0;
      for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        if (cumulative >= lowTarget) { low = i; break; }
      }
      cumulative = 0;
      for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        if (cumulative >= highTarget) { high = i; break; }
      }
      const range = Math.max(1, high - low);
      for (let i = 0; i < image.data.length; i += 4) {
        const value = Math.max(0, Math.min(255, ((image.data[i] - low) / range) * 255));
        image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      }
    }
    context.putImageData(image, 0, 0);
    return canvas;
  });
}

$('receipt').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  editId = null;
  entryType = 'expense';
  category = CATEGORIES.expense[0];
  activeExpenseGroup = 0;
  setType(entryType);
  $('amount').value = '';
  $('memo').value = '';
  $('date').value = today();
  $('deleteEntry').hidden = true;
  const status = $('ocrStatus');
  status.hidden = false;
  status.textContent = 'レシートを読み取り中…';
  try {
    if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
    status.textContent = '画像を補正して文字を読み取っています…';
    const enhanced = await prepareReceiptImage(file);
    const firstPass = await Tesseract.recognize(enhanced, 'jpn+eng', {
      logger: message => {
        if (message.status === 'recognizing text' && message.progress) {
          status.textContent = `レシートを読み取り中… ${Math.round(message.progress * 100)}%`;
        }
      }
    });
    let result = parseReceipt(firstPass.data.text);
    if (!result.amount) {
      status.textContent = '読み取りを調整して再試行しています…';
      const highContrast = await prepareReceiptImage(file, true);
      const secondPass = await Tesseract.recognize(highContrast, 'jpn+eng');
      const retryResult = parseReceipt(secondPass.data.text);
      if (retryResult.amount) {
        result = {
          amount: retryResult.amount,
          date: retryResult.date || result.date,
          store: retryResult.store || result.store
        };
      }
    }
    if (result.amount) setAmount(String(result.amount));
    if (result.date) $('date').value = result.date;
    if (result.store) $('memo').value = result.store;
    status.textContent = result.amount
      ? '読み取り完了。金額や日付、メモを確認してから入力してください。'
      : '金額を読み取れませんでした。画像を明るく平らに撮り直すか、金額を手入力してください。';
  } catch (error) {
    console.error('Receipt OCR failed:', error);
    status.textContent = `読み取りに失敗しました: ${error.message || '通信環境を確認して手入力してください。'}`;
  }
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
setType(entryType);
$('date').value = today();
render();
