let globalDB = {};
let currentLevel = null;
let escapeBuff = false;
let inventory = {};

let rollCountInLevel = 0;
let escapeBonus = 0;

const ITEM_DICTIONARY = {
    "Almond Water": "Hồi phục sức khỏe tinh thần, chữa lành vết thương nhẹ.",
    "Firesalt": "Tinh thể nổ mạnh khi bị va đập.",
    "Royal Rations": "Thức ăn dạng thạch cung cấp dinh dưỡng cực cao.",
    "Squirt Gun": "Vũ khí bắn nước tầm xa.",
    "Memory Juice": "Khôi phục ký ức đã mất.",
    "Liquid Pain": "Cực độc. Dùng làm vũ khí sinh hóa.",
    "Thùng tiếp tế M.E.G.": "Chứa thực phẩm và vật tư y tế.",
    "Nước tăng lực": "Tăng tốc độ di chuyển."
};

function getEffect(itemName) {
    for (let key in ITEM_DICTIONARY) {
        if (itemName.includes(key)) return ITEM_DICTIONARY[key];
    }
    return "Vật phẩm sinh tồn thông thường.";
}

function addToInventory(item) {
    inventory[item] = (inventory[item] || 0) + 1;
    renderInventory();
}

function renderInventory() {
    const list = document.getElementById('inventoryList');
    const emptyMsg = document.getElementById('invEmpty');
    list.innerHTML = '';
    let hasItems = false;
    for (let item in inventory) {
        hasItems = true;
        let li = document.createElement('li');
        li.className = 'inv-item';
        li.innerHTML = `${item} <span class="inv-count">x${inventory[item]}</span><span class="inv-desc">${getEffect(item)}</span>`;
        list.appendChild(li);
    }
    emptyMsg.style.display = hasItems ? 'none' : 'block';
}

async function initializeDatabase() {
    try {
        const filesToLoad = ['db_1_50.json', 'db_51_200.json', 'db_200_500.json'];
        for (const file of filesToLoad) {
            const response = await fetch(file);
            if (response.ok) {
                const data = await response.json();
                Object.assign(globalDB, data);
            }
        }
        const sortedKeys = Object.keys(globalDB).sort((a, b) => parseFloat(a) - parseFloat(b));
        const select = document.getElementById('levelSelect');
        select.innerHTML = '<option value="" disabled selected>-- CHỌN LEVEL --</option>';
        sortedKeys.forEach(key => {
            let opt = document.createElement('option');
            opt.value = key;
            opt.innerText = `Level ${key} - ${globalDB[key].name}`;
            select.appendChild(opt);
        });
        select.disabled = false;
        document.getElementById('loadBtn').disabled = false;
        document.getElementById('dbStatus').innerText = `> DATABASES LOADED. ${sortedKeys.length} LEVELS VERIFIED.`;
    } catch (e) {
        document.getElementById('dbStatus').innerText = "> ERROR LOADING JSON. CẦN CHẠY LOCAL SERVER.";
    }
}

function updateEscapeUI() {
    const fill = document.getElementById('escapeBarFill');
    const text = document.getElementById('escapeText');
    if (rollCountInLevel < 2) {
        fill.style.width = '0%';
        text.innerText = `Chưa kích hoạt (Cần ${2 - rollCountInLevel} lượt nữa)`;
    } else {
        fill.style.width = `${escapeBonus}%`;
        text.innerText = `Đã kích hoạt: +${escapeBonus}% Tỉ lệ Lối thoát`;
    }
}

function getThresholds(c, hasEntities) {
    let pMax = 25 + (c * 5);
    if (!hasEntities) return { p: 50, s: 100 };
    let sMax = 75 - (c * 8);
    if (sMax < pMax + 5) sMax = pMax + 5;
    return { p: pMax, s: sMax };
}

function loadLevel() {
    const input = document.getElementById('levelSelect').value;
    if (!input) return;
    const data = globalDB[input];
    currentLevel = data;
    
    // TÍNH NĂNG MỚI: Reset Balo khi sang Level mới
    inventory = {};
    renderInventory();
    
    // Reset Lối thoát
    rollCountInLevel = 0;
    escapeBonus = 0;
    updateEscapeUI();
    
    document.getElementById('levelName').innerText = `Level ${input}: ${data.name}`;
    document.getElementById('survivalClass').innerText = data.class === 0 ? "0 (Safe)" : data.class;
    document.getElementById('levelDesc').innerText = data.desc;
    document.getElementById('levelImg').src = data.image || "";
    
    const thresh = getThresholds(data.class, data.entities.length > 0);
    const pWidth = thresh.p, sWidth = data.entities.length === 0 ? 100 - pWidth : thresh.s - pWidth, eWidth = data.entities.length === 0 ? 0 : 100 - thresh.s;
    document.getElementById('barPhenom').style.width = `${pWidth}%`;
    document.getElementById('barSafe').style.width = `${sWidth}%`;
    document.getElementById('barEntity').style.width = `${eWidth}%`;

    document.getElementById('levelInfo').style.display = 'block';
    document.getElementById('rollBtn').disabled = false;
    document.getElementById('resultText').innerText = "> DATABASE LOADED. READY.";
    document.getElementById('resultText').className = "result";
    document.getElementById('escapeBtn').style.display = 'none';
    document.getElementById('buffStatus').innerText = "";
}

function startRoll() {
    const btn = document.getElementById('rollBtn');
    btn.disabled = true;
    document.getElementById('escapeBtn').style.display = 'none';
    let duration = 500, elapsed = 0, interval = 25;
    
    let rollTimer = setInterval(() => {
        document.getElementById('rollNumber').innerText = Math.floor(Math.random() * 100) + 1;
        elapsed += interval;
        if (elapsed >= duration) {
            clearInterval(rollTimer);
            finishRoll();
            btn.disabled = false;
        }
    }, interval);
}

function finishRoll() {
    rollCountInLevel++;
    const finalNum = parseInt(document.getElementById('rollNumber').innerText);
    const res = document.getElementById('resultText');
    const thresh = getThresholds(currentLevel.class, currentLevel.entities.length > 0);

    if (rollCountInLevel > 2) {
        let escRoll = Math.floor(Math.random() * 90) + 1; 
        if (escRoll + escapeBonus >= 100) {
            res.innerHTML = `<strong>NOCLIP THÀNH CÔNG [Roll: ${escRoll} + Bonus: ${escapeBonus}%]:</strong> Bạn đã tìm thấy một điểm mù của thực tại và rớt sang Level khác!`;
            res.className = "result escape-success";
            rollCountInLevel = 0; escapeBonus = 0; updateEscapeUI();
            document.getElementById('buffStatus').innerText = "Trạng thái: Vừa noclip thành công. Vui lòng CHỌN LEVEL MỚI ở menu.";
            return;
        } else {
            escapeBonus += 2;
            updateEscapeUI();
        }
    } else {
        updateEscapeUI();
    }

    if (finalNum === 1) {
        res.innerHTML = "<strong>CRITICAL FAILURE [1]:</strong> Thực tại sụp đổ. Rơi vào The Void.";
        res.className = "result danger"; escapeBuff = false;
    } 
    else if (finalNum === 100) {
        res.innerHTML = "<strong>FATAL ERROR [100]: THE RED KNIGHT.</strong> Anh ta đã mở cho bạn một lối thoát.";
        res.className = "result danger"; escapeBuff = true; escapeBonus += 100; updateEscapeUI();
    }
    else if (finalNum <= thresh.p && currentLevel.phenomena.length > 0) {
        let p = currentLevel.phenomena[Math.floor(Math.random() * currentLevel.phenomena.length)];
        res.innerHTML = `<strong>Dị Tượng [${finalNum}]:</strong> ${p}`;
        res.className = "result";
    }
    else if (finalNum <= thresh.s || currentLevel.entities.length === 0) {
        if (Math.random() > 0.4 && currentLevel.items.length > 0) {
            let item = currentLevel.items[Math.floor(Math.random() * currentLevel.items.length)];
            res.innerHTML = `<strong>Vật Phẩm [${finalNum}]:</strong> Đã thu thập: <u>${item}</u>`;
            addToInventory(item);
        } else {
            res.innerHTML = `<strong>Vùng An Toàn [${finalNum}]:</strong> Không có đe dọa.`;
        }
        res.className = "result safe";
    }
    else {
        if (escapeBuff) {
            res.innerHTML = `<strong>ĐÃ NÉ TRÁNH [${finalNum}]:</strong> Kích hoạt cảnh giác, trốn thoát thành công!`;
            res.className = "result safe"; escapeBuff = false;
            document.getElementById('buffStatus').innerText = "";
        } else {
            let e = currentLevel.entities[Math.floor(Math.random() * currentLevel.entities.length)];
            res.innerHTML = `<strong>Thực Thể [${finalNum}]:</strong> Đụng độ <b>${e}</b>!`;
            res.className = "result danger";
            document.getElementById('escapeBtn').style.display = 'inline-block';
        }
    }
}

function triggerEscape() {
    escapeBuff = true;
    document.getElementById('escapeBtn').style.display = 'none';
    document.getElementById('resultText').innerHTML += "<br><em>=> Chạy trốn thành công! (1 lần né)</em>";
    document.getElementById('buffStatus').innerText = "Trạng thái: Đang cảnh giác (Sẽ tự động bỏ qua quái 1 lần)";
}

initializeDatabase();