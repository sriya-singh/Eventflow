import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import { firebaseConfig, API_KEY } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore();
const auth = getAuth();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function fetchEvents() {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    if (!loggedInUserId) {
        console.log("User not logged in");
        return;
    }

    const querySnapshot = await getDocs(collection(db, 'events'));
    const eventsContainer = document.getElementById('events-container');
    eventsContainer.innerHTML = '';

    querySnapshot.forEach((doc) => {
        const event = doc.data();
        if (event.createdBy === loggedInUserId) {
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event');
            eventDiv.innerHTML = `
                <h2>${event.name}</h2>
                <p><strong>Date:</strong> ${event.date}</p>
                <p><strong>Time:</strong> ${event.time}</p>
                <p><strong>Venue:</strong> ${event.venue}</p>
                <p><strong>Description:</strong> ${event.description}</p>
                <h3>Guests</h3>
                <ul>
                    ${event.guests.filter(guest => guest.name && guest.contact).map(guest => `<li>${guest.name} (${guest.contact})</li>`).join('')}
                </ul>
                <h3>Schedule</h3>
                <ul>
                    ${event.schedule.filter(s => s.name && s.time).map(s => `<li>${s.name} at ${s.time}</li>`).join('')}
                </ul>
                <h3>Items</h3>
                <ul>
                    ${event.items.filter(item => item).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <h3>Funding Log</h3>
                <ul>
                    ${event.fundingLog.filter(f => f.description && f.amount).map(f => `<li>${f.description}: $${f.amount}</li>`).join('')}
                </ul>
                <button class="delete-btn" onclick="deleteEvent('${doc.id}')">Delete Event</button>
                <button class="edit-btn" onclick="showEditForm('${doc.id}', ${JSON.stringify(event).replace(/"/g, '&quot;')})">Edit Event</button>
                <button class="generate-invite-btn" onclick="showGenerateInviteForm('${doc.id}', ${JSON.stringify(event).replace(/"/g, '&quot;')})">Generate Invite</button>
            `;
            eventsContainer.appendChild(eventDiv);
        }
    });
}

async function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        await deleteDoc(doc(db, 'events', eventId));
        fetchEvents();
    }
}

function showEditForm(eventId, eventData) {
    const editModal = document.getElementById('edit-event-modal');
    const editForm = document.getElementById('editEventForm');
    
    editForm.innerHTML = `
        <input type="hidden" id="editEventId" value="${eventId}">
        <div class="form-group">
            <label for="editEventName">Event Name</label>
            <input type="text" id="editEventName" value="${eventData.name}" required>
        </div>
        <div class="form-group">
            <label for="editEventDate">Date</label>
            <input type="date" id="editEventDate" value="${eventData.date}" required>
        </div>
        <div class="form-group">
            <label for="editEventTime">Time</label>
            <input type="time" id="editEventTime" value="${eventData.time}" required>
        </div>
        <div class="form-group">
            <label for="editEventVenue">Venue</label>
            <input type="text" id="editEventVenue" value="${eventData.venue}" required>
        </div>
        <div class="form-group">
            <label>Guests</label>
            <div id="editGuests">
                ${eventData.guests.map(guest => `
                <div>
                    <input type="text" placeholder="Guest Name" class="editGuestName" value="${guest.name}">
                    <input type="text" placeholder="Contact Info" class="editGuestContact" value="${guest.contact}">
                    <button type="button" class="remove-btn" onclick="removeGuest(this)">Remove</button>
                </div>
                `).join('')}
            </div>
            <button type="button" class="add-btn" onclick="addGuest()">Add Guest</button>
        </div>
        <div class="form-group">
            <label>Schedule</label>
            <div id="editSchedule">
                ${eventData.schedule.map(subEvent => `
                <div>
                    <input type="text" placeholder="Sub Event Name" class="editSubEventName" value="${subEvent.name}">
                    <input type="time" class="editSubEventTime" value="${subEvent.time}">
                    <button type="button" class="remove-btn" onclick="removeSchedule(this)">Remove</button>
                </div>
                `).join('')}
            </div>
            <button type="button" class="add-btn" onclick="addSchedule()">Add Sub Event</button>
        </div>
        <div class="form-group">
            <label>Items</label>
            <div id="editItems">
                ${eventData.items.map(item => `
                <div>
                    <input type="text" placeholder="Item Name" class="editItemName" value="${item}">
                    <button type="button" class="remove-btn" onclick="removeItem(this)">Remove</button>
                </div>
                `).join('')}
            </div>
            <button type="button" class="add-btn" onclick="addItem()">Add Item</button>
        </div>
        <div class="form-group">
            <label>Funding Log</label>
            <div id="editFundingLog">
                ${eventData.fundingLog.map(funding => `
                <div>
                    <input type="text" placeholder="Description" class="editFundingDescription" value="${funding.description}">
                    <input type="number" placeholder="Amount" class="editFundingAmount" value="${funding.amount}">
                    <button type="button" class="remove-btn" onclick="removeFunding(this)">Remove</button>
                </div>
                `).join('')}
            </div>
            <button type="button" class="add-btn" onclick="addFunding()">Add Funding Log</button>
        </div>
        <button type="submit" class="btn">Update Event</button>
    `;

    editForm.addEventListener('submit', updateEvent);
    editModal.style.display = 'block';
}

function closeEditModal() {
    document.getElementById('edit-event-modal').style.display = 'none';
}

async function updateEvent(event) {
    event.preventDefault();
    const eventId = document.getElementById('editEventId').value;
    const updatedEvent = {
        name: document.getElementById('editEventName').value,
        date: document.getElementById('editEventDate').value,
        time: document.getElementById('editEventTime').value,
        venue: document.getElementById('editEventVenue').value,
        guests: [...document.querySelectorAll('#editGuests > div')].map(guestDiv => ({
            name: guestDiv.querySelector('.editGuestName').value,
            contact: guestDiv.querySelector('.editGuestContact').value,
        })),
        schedule: [...document.querySelectorAll('#editSchedule > div')].map(scheduleDiv => ({
            name: scheduleDiv.querySelector('.editSubEventName').value,
            time: scheduleDiv.querySelector('.editSubEventTime').value,
        })),
        items: [...document.querySelectorAll('#editItems > div')].map(itemDiv => itemDiv.querySelector('.editItemName').value),
        fundingLog: [...document.querySelectorAll('#editFundingLog > div')].map(fundingDiv => ({
            description: fundingDiv.querySelector('.editFundingDescription').value,
            amount: fundingDiv.querySelector('.editFundingAmount').value,
        })),
    };

    await updateDoc(doc(db, 'events', eventId), updatedEvent);
    document.getElementById('edit-event-modal').style.display = 'none';
    fetchEvents();
}

function showGenerateInviteForm(eventId, eventData) {
    const generateInviteModal = document.getElementById('generate-invite-modal');
    const guestSelect = document.getElementById('guestSelect');
    guestSelect.innerHTML = '<option value="all">All</option>' + eventData.guests.map(guest => `<option value="${guest.name}">${guest.name}</option>`).join('');
    generateInviteModal.style.display = 'block';
    generateInviteModal.dataset.eventId = eventId;
    generateInviteModal.dataset.eventData = JSON.stringify(eventData);
}

function closeGenerateInviteModal() {
    document.getElementById('generate-invite-modal').style.display = 'none';
}

async function generateInvite(event) {
    event.preventDefault();
    const eventId = document.getElementById('generate-invite-modal').dataset.eventId;
    const eventData = JSON.parse(document.getElementById('generate-invite-modal').dataset.eventData);
    const guestName = document.getElementById('guestSelect').value;

    let prompt = `Generate an email invitation for the following event:
    Event Name: ${eventData.name}
    Date: ${eventData.date}
    Time: ${eventData.time}
    Venue: ${eventData.venue}
    Description: ${eventData.description}`;

    if (guestName === 'all') {
        prompt += `\nAudience: All guests`;
    } else {
        prompt += `\nGuest Name: ${guestName}\nMake the email personalized for this guest.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const inviteText = response.text();

    document.getElementById('generatedInvite').style.display = 'block';
    document.getElementById('inviteText').innerText = inviteText;
}

function copyInvite() {
    const inviteText = document.getElementById('inviteText').innerText;
    navigator.clipboard.writeText(inviteText)
        .then(() => alert('Invite copied to clipboard'))
        .catch(err => console.error('Error copying text: ', err));
}

document.getElementById('generateInviteForm').addEventListener('submit', generateInvite);

// Additional helper functions for dynamically adding/removing guests, schedule items, etc.

function addGuest() {
    const guestsDiv = document.getElementById('editGuests');
    const guestDiv = document.createElement('div');
    guestDiv.innerHTML = `
        <input type="text" placeholder="Guest Name" class="editGuestName">
        <input type="text" placeholder="Contact Info" class="editGuestContact">
        <button type="button" class="remove-btn" onclick="removeGuest(this)">Remove</button>
    `;
    guestsDiv.appendChild(guestDiv);
}

function removeGuest(element) {
    element.parentElement.remove();
}

function addSchedule() {
    const scheduleDiv = document.getElementById('editSchedule');
    const subEventDiv = document.createElement('div');
    subEventDiv.innerHTML = `
        <input type="text" placeholder="Sub Event Name" class="editSubEventName">
        <input type="time" class="editSubEventTime">
        <button type="button" class="remove-btn" onclick="removeSchedule(this)">Remove</button>
    `;
    scheduleDiv.appendChild(subEventDiv);
}

function removeSchedule(element) {
    element.parentElement.remove();
}

function addItem() {
    const itemsDiv = document.getElementById('editItems');
    const itemDiv = document.createElement('div');
    itemDiv.innerHTML = `
        <input type="text" placeholder="Item Name" class="editItemName">
        <button type="button" class="remove-btn" onclick="removeItem(this)">Remove</button>
    `;
    itemsDiv.appendChild(itemDiv);
}

function removeItem(element) {
    element.parentElement.remove();
}

function addFunding() {
    const fundingLogDiv = document.getElementById('editFundingLog');
    const fundingDiv = document.createElement('div');
    fundingDiv.innerHTML = `
        <input type="text" placeholder="Description" class="editFundingDescription">
        <input type="number" placeholder="Amount" class="editFundingAmount">
        <button type="button" class="remove-btn" onclick="removeFunding(this)">Remove</button>
    `;
    fundingLogDiv.appendChild(fundingDiv);
}

function removeFunding(element) {
    element.parentElement.remove();
}

// Ensure fetchEvents and deleteEvent are globally accessible
window.fetchEvents = fetchEvents;
window.deleteEvent = deleteEvent;
window.showEditForm = showEditForm;
window.addGuest = addGuest;
window.removeGuest = removeGuest;
window.addSchedule = addSchedule;
window.removeSchedule = removeSchedule;
window.addItem = addItem;
window.removeItem = removeItem;
window.addFunding = addFunding;
window.removeFunding = removeFunding;
window.closeEditModal = closeEditModal;
window.showGenerateInviteForm = showGenerateInviteForm;
window.closeGenerateInviteModal = closeGenerateInviteModal;
window.generateInvite = generateInvite;
window.copyInvite = copyInvite;

fetchEvents();
