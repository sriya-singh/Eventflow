import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, doc, getDocs, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { vertexAI } from '@genkit-ai/vertexai';
import { configureGenkit, generate } from '@genkit-ai/core';
import { firebaseConfig } from './config.js';

configureGenkit({
    plugins: [vertexAI()],
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchEvents() {
    const eventsSelect = document.getElementById('eventSelect');
    eventsSelect.innerHTML = '<option value="">Select an event...</option>'; // Clear previous options

    const eventsRef = collection(db, 'events');
    const snapshot = await getDocs(eventsRef);

    snapshot.forEach(doc => {
        const eventData = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = eventData.name;
        eventsSelect.appendChild(option);
    });

    eventsSelect.addEventListener('change', fetchGuests);
}

async function fetchGuests() {
    const eventId = document.getElementById('eventSelect').value;
    const guestsSelect = document.getElementById('guestSelect');
    guestsSelect.innerHTML = '<option value="">Select a guest...</option>'; // Clear previous options

    if (!eventId) return; // Exit if no event selected

    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        eventData.guests.forEach(guest => {
            const option = document.createElement('option');
            option.value = guest.contact;
            option.textContent = guest.name;
            guestsSelect.appendChild(option);
        });
        guestsSelect.appendChild(createPublicOption()); // Assuming 'Public' as an option
    }
}

function createPublicOption() {
    const option = document.createElement('option');
    option.value = 'public@example.com';
    option.textContent = 'Public';
    return option;
}

async function generateEmail() {
    const eventId = document.getElementById('eventSelect').value;
    const guestContact = document.getElementById('guestSelect').value;

    if (!eventId || !guestContact) {
        console.log('Please select an event and a guest');
        return;
    }

    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const guest = eventData.guests.find(guest => guest.contact === guestContact);

        if (guest) {
            const prompt = generatePrompt(eventData, guest);

            try {
                const llmResponse = await generate({
                    model: vertexAI.geminiPro,
                    prompt
                });

                const generatedEmail = llmResponse.text();
                const generatedEmailContainer = document.getElementById('generatedEmailContainer');
                generatedEmailContainer.textContent = generatedEmail;
            } catch (error) {
                console.error('Error generating email:', error);
            }
        } else {
            console.log('Guest not found');
        }
    } else {
        console.log('Event not found');
    }
}

function generatePrompt(eventData, guest) {
    return `Subject: Invitation to ${eventData.name}\n\nDear ${guest.name},\n\nYou are invited to attend our event on ${eventData.date} at ${eventData.time}.\n\nVenue: ${eventData.venue}\nDescription: ${eventData.description}\n\nPlease let us know your availability.\n\nSincerely,\n[Your Name]`;
}

document.getElementById('generateEmailBtn').addEventListener('click', generateEmail);

// Initial fetch of events when the page loads
fetchEvents();
