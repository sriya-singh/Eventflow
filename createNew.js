import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

document.getElementById('addGuest').addEventListener('click', () => {
    const guestsDiv = document.getElementById('guests');
    const newGuest = document.createElement('div');
    newGuest.innerHTML = `
        <input type="text" placeholder="Guest Name" class="guestName">
        <input type="text" placeholder="Contact Info" class="guestContact">
        <button type="button" class="remove-btn" onclick="removeGuest(this)">Remove</button>
    `;
    guestsDiv.appendChild(newGuest);
});

document.getElementById('addSchedule').addEventListener('click', () => {
    const scheduleDiv = document.getElementById('schedule');
    const newSchedule = document.createElement('div');
    newSchedule.innerHTML = `
        <input type="text" placeholder="Sub Event Name" class="subEventName">
        <input type="time" class="subEventTime">
        <button type="button" class="remove-btn" onclick="removeSchedule(this)">Remove</button>
    `;
    scheduleDiv.appendChild(newSchedule);
});

document.getElementById('addItem').addEventListener('click', () => {
    const itemsDiv = document.getElementById('items');
    const newItem = document.createElement('div');
    newItem.innerHTML = `
        <input type="text" placeholder="Item Name" class="itemName">
        <button type="button" class="remove-btn" onclick="removeItem(this)">Remove</button>
    `;
    itemsDiv.appendChild(newItem);
});

document.getElementById('addFunding').addEventListener('click', () => {
    const fundingLogDiv = document.getElementById('fundingLog');
    const newFunding = document.createElement('div');
    newFunding.innerHTML = `
        <input type="text" placeholder="Description" class="fundingDescription">
        <input type="number" placeholder="Amount" class="fundingAmount">
        <button type="button" class="remove-btn" onclick="removeFunding(this)">Remove</button>
    `;
    fundingLogDiv.appendChild(newFunding);
});

document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventName = document.getElementById('eventName').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventVenue = document.getElementById('eventVenue').value;
    const eventDescription = document.getElementById('eventDescription').value; // Added

    const guests = Array.from(document.getElementsByClassName('guestName')).map((el, index) => ({
        name: el.value,
        contact: document.getElementsByClassName('guestContact')[index].value
    })).filter(guest => guest.name && guest.contact);

    const schedule = Array.from(document.getElementsByClassName('subEventName')).map((el, index) => ({
        name: el.value,
        time: document.getElementsByClassName('subEventTime')[index].value
    })).filter(s => s.name && s.time);

    const items = Array.from(document.getElementsByClassName('itemName')).map(el => el.value).filter(item => item);

    const fundingLog = Array.from(document.getElementsByClassName('fundingDescription')).map((el, index) => ({
        description: el.value,
        amount: document.getElementsByClassName('fundingAmount')[index].value
    })).filter(f => f.description && f.amount);

    try {
        const docRef = await addDoc(collection(db, 'events'), {
            name: eventName,
            date: eventDate,
            time: eventTime,
            venue: eventVenue,
            description: eventDescription, // Added
            guests: guests,
            schedule: schedule,
            items: items,
            fundingLog: fundingLog,
            createdBy: auth.currentUser.uid
        });
        alert('Event created successfully!');
        document.getElementById('eventForm').reset();
    } catch (e) {
        console.error('Error adding document: ', e);
    }
});


function removeGuest(button) {
    button.parentElement.remove();
}

function removeSchedule(button) {
    button.parentElement.remove();
}

function removeItem(button) {
    button.parentElement.remove();
}

function removeFunding(button) {
    button.parentElement.remove();
}