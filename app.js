// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7u56_bJ2IfQGxglyfo5DSqAj7TmnRppw",
  authDomain: "://firebaseapp.com",
  projectId: "rent-app-a88b8",
  storageBucket: "rent-app-a88b8.firebasestorage.app",
  messagingSenderId: "770067014594",
  appId: "1:770067014594:web:10bd76dea1633eca98ac5b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Collections Refs
const propertiesRef = db.collection("properties");
const rentRef = db.collection("rent_collections");
const expenseRef = db.collection("expenses");

// Local App State for Data Storage
let allRents = [];
let allExpenses = [];

// --- 1. Property Setup ---
document.getElementById("property-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ownerName = document.getElementById("owner-name").value;
    const buildingName = document.getElementById("building-name").value;
    const unitName = document.getElementById("unit-name").value;
    const fixedRent = Number(document.getElementById("fixed-rent").value);

    try {
        await propertiesRef.add({ ownerName, buildingName, unitName, fixedRent, createdAt: new Date() });
        document.getElementById("property-form").reset();
    } catch (err) { console.error("Error adding property: ", err); }
});

// Real-time Properties View & Dropdown Update
propertiesRef.orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    const list = document.getElementById("property-list");
    const select = document.getElementById("rent-unit-select");
    list.innerHTML = "";
    select.innerHTML = '<option value="">দোকান/বাড়ি নির্বাচন করুন</option>';

    snapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.buildingName} - ${data.unitName} (মালিক: ${data.ownerName}, ভাড়া: ৳${data.fixedRent})`;
        list.appendChild(li);

        const option = document.createElement("option");
        option.value = JSON.stringify({ unit: data.unitName, building: data.buildingName });
        option.textContent = `${data.buildingName} - ${data.unitName}`;
        select.appendChild(option);
    });
});

// --- 2. Rent Collection ---
document.getElementById("rent-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectValue = document.getElementById("rent-unit-select").value;
    if(!selectValue) return alert("দয়া করে দোকান বা বাড়ি নির্বাচন করুন");
    
    const pData = JSON.parse(selectValue);
    const month = document.getElementById("rent-month").value;
    const date = document.getElementById("rent-date").value;
    const receiptNo = document.getElementById("receipt-no").value;
    const amount = Number(document.getElementById("rent-amount").value);

    try {
        await rentRef.add({ 
            buildingName: pData.building, unitName: pData.unit, 
            month, date, receiptNo, amount, timestamp: new Date(date) 
        });
        document.getElementById("rent-form").reset();
    } catch (err) { console.error(err); }
});

// --- 3. Expense Management ---
document.getElementById("expense-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const sector = document.getElementById("expense-sector").value;
    const date = document.getElementById("expense-date").value;
    const by = document.getElementById("expense-by").value || "উল্লেখ নেই";
    const amount = Number(document.getElementById("expense-amount").value);

    try {
        await expenseRef.add({ sector, date, by, amount, timestamp: new Date(date) });
        document.getElementById("expense-form").reset();
    } catch (err) { console.error(err); }
});

// --- 4. Live Dashboard Calculations ---
function updateDashboard() {
    const totalRent = allRents.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = allExpenses.reduce((sum, item) => sum + item.amount, 0);
    const cashInHand = totalRent - totalExpense;

    document.getElementById("total-rent").textContent = totalRent;
    document.getElementById("total-expense").textContent = totalExpense;
    document.getElementById("cash-in-hand").textContent = cashInHand;
}

rentRef.onSnapshot((snapshot) => {
    allRents = [];
    snapshot.forEach(doc => allRents.push(doc.data()));
    updateDashboard();
});

expenseRef.onSnapshot((snapshot) => {
    allExpenses = [];
    snapshot.forEach(doc => allExpenses.push(doc.data()));
    updateDashboard();
});

// --- 5. CSV Report Generation (Date Range Filter) ---
document.getElementById("download-csv-btn").addEventListener("click", () => {
    const start = document.getElementById("start-date").value;
    const end = document.getElementById("end-date").value;

    if (!start || !end) {
        alert("দয়া করে শুরুর তারিখ এবং শেষ তারিখ সিলেক্ট করুন।");
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59);

    const filteredRents = allRents.filter(r => {
        const d = new Date(r.date);
        return d >= startDate && d <= endDate;
    });

    const filteredExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= startDate && d <= endDate;
    });

    let csvContent = "\ufeff"; 
    csvContent += `রিপোর্ট সময়কাল:, ${start} থেকে ${end}\n\n`;

    csvContent += "--- আদায়কৃত ভাড়া ---\n";
    csvContent += "তারিখ, বাড়ি/মার্কেট, দোকান/রুম, মাস, রসিদ নং, পরিমাণ (৳)\n";
    filteredRents.forEach(r => {
        csvContent += `${r.date}, ${r.buildingName}, ${r.unitName}, ${r.month}, ${r.receiptNo}, ${r.amount}\n`;
    });

    csvContent += "\n--- খরচ বিবরণী ---\n";
    csvContent += "তারিখ, খরচের খাত, খরচকারী, পরিমাণ (৳)\n";
    filteredExpenses.forEach(e => {
        csvContent += `${e.date}, ${e.sector}, ${e.by}, ${e.amount}\n`;
    });

    const tRent = filteredRents.reduce((sum, item) => sum + item.amount, 0);
    const tExpense = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    csvContent += `\n--- সর্বমোট সামারি ---\n`;
    csvContent += `মোট আদায়কৃত ভাড়া:, ৳ ${tRent}\n`;
    csvContent += `মোট খরচ:, ৳ ${tExpense}\n`;
    csvContent += `অবशिष्ट ক্যাশ ইন হ্যান্ড:, ৳ ${tRent - tExpense}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rent_Report_${start}_to_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
