import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, getDoc, doc, deleteDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

onAuthStateChanged(auth, (user) => {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    if (loggedInUserId) {
        console.log(user);
        const docRef = doc(db, "users", loggedInUserId);
        getDoc(docRef)
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    document.getElementById('profileUserFName').innerText = userData.firstName;
                    document.getElementById('profileUserEmail').innerText = userData.email;
                    document.getElementById('profileUserLName').innerText = userData.lastName;
                } else {
                    console.log("No document found matching id");
                }
            })
            .catch((error) => {
                console.log("Error getting document");
            });
    } else {
        console.log("User Id not found in Local Storage");
    }
});

const logoutButton = document.getElementById('logout');
const deleteAccountButton = document.getElementById('deleteAccount');

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('loggedInUserId');
    signOut(auth)
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error('Error signing out:', error);
        });
});

deleteAccountButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        const user = auth.currentUser;
        const userId = user.uid;

        // Delete user events
        deleteEventsForUser(userId)
            .then(() => {
                console.log('All user events deleted');
                // Delete user data from Firestore users collection
                const userDocRef = doc(db, 'users', userId);
                return deleteDoc(userDocRef);
            })
            .then(() => {
                console.log('User data deleted from Firestore');
                // Now delete the Firebase Authentication user account
                return deleteUser(user);
            })
            .then(() => {
                console.log('User deleted successfully');
                // Redirect to login or home page after deletion
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Error deleting user or user data:', error);
                alert('Failed to delete user. Please try again later.');
            });
    }
});

async function deleteEventsForUser(userId) {
    const querySnapshot = await getDocs(collection(db, 'events'));
    const deletePromises = [];

    querySnapshot.forEach((docSnapshot) => {
        const event = docSnapshot.data();
        if (event.createdBy === userId) {
            deletePromises.push(deleteDoc(doc(db, 'events', docSnapshot.id)));
        }
    });

    return Promise.all(deletePromises);
}