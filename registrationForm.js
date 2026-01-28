import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Same config as index.html
const firebaseConfig = {
    apiKey: "AIzaSyCWpp7vH0FAubDAW1Gvw5LMmtEqfMIq4u0",
    authDomain: "niat-admission-form.firebaseapp.com",
    projectId: "niat-admission-form",
    storageBucket: "niat-admission-form.firebasestorage.app",
    messagingSenderId: "907218345703",
    appId: "1:907218345703:web:57e6dd3d74baab2f190c42",
    measurementId: "G-YPCVGYS7L9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 1. AUTH CHECK & REDIRECT
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User logged in: Populate Fields
        document.getElementById('user-display-name').textContent = user.displayName || "Student";
        document.getElementById('email-field').value = user.email;
        if(user.displayName) document.getElementById('regName').value = user.displayName;
        document.getElementById('email-field').classList.add('filled-input');
        
        // Handle URL Param for Course
        const urlParams = new URLSearchParams(window.location.search);
        const courseParam = urlParams.get('course');
        if(courseParam) {
            autoSelectCourse(decodeURIComponent(courseParam));
        }
    } else {
        // Not logged in: Redirect to Home
        alert("You must be logged in to access the registration form.");
        window.location.href = 'index.html';
    }
});

// 2. COURSE AUTO-SELECT LOGIC
function autoSelectCourse(courseName) {
    const selects = document.querySelectorAll('.course-select');
    let found = false;
    
    selects.forEach(select => {
        // Reset all selects first
        select.value = "";
        select.classList.remove('filled-input');
        
        // Loop options to find match
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === courseName) {
                select.value = courseName;
                select.classList.add('filled-input');
                found = true;
                break;
            }
        }
    });
    
    if(!found) console.warn("Course name from URL not found in dropdowns:", courseName);
}

// 3. GO BACK BUTTONS
document.getElementById('go-back-btn').addEventListener('click', () => window.location.href = 'index.html');
const successBack = document.getElementById('success-go-back-btn');
if(successBack) successBack.addEventListener('click', () => window.location.href = 'index.html');


// --- REST OF ORIGINAL FORM LOGIC (Payment, File Check, Submit) ---
const URL_ARIKUCHI = "https://script.google.com/macros/s/AKfycbwAuL-1Il5Ux9MS_DPUU20w7C-h1QVZP8oJ2_XXWAlqbnwXKS51WD99NDGGwHMzk3AL/exec"; 
const URL_BAGALS   = "https://script.google.com/macros/s/AKfycbxvaMe5DDUsEOzyrsI0mjmr0IBAA9HhDpE8l_G54p_NIIPY60ol2aBXfI2qQtH7BcP8/exec";
const MAX_SIZE = 1 * 1024 * 1024;

function checkFileSize(fileInput) {
    const display = document.getElementById(fileInput.id + "-name");
    if(fileInput.files.length > 0) {
        if(fileInput.files[0].size > MAX_SIZE) {
            alert("File is too big! Max size is 1MB.");
            fileInput.value = ""; 
            if(display) display.textContent = "No file added";
        } else {
            if(display) display.textContent = fileInput.files[0].name;
        }
    }
}

['photoFile', 'docFile', 'payFile'].forEach(id => {
    document.getElementById(id).addEventListener('change', function() { checkFileSize(this) });
});

// Payment Toggle
document.querySelectorAll('input[name="payMode"]').forEach(radio => {
    radio.addEventListener('change', function() {
        document.getElementById('online-payment-section').classList.toggle('hidden', this.value !== 'Online');
    });
});

// Select Mutuality (Only one course selected)
const selects = document.querySelectorAll('.course-select');
selects.forEach(select => {
  select.addEventListener('change', function() {
    if(this.value !== "") {
        selects.forEach(other => { 
            if(other !== this) { 
                other.value = ""; 
                other.classList.remove('filled-input'); 
            } 
        });
    }
  });
});

// Form Submit Handling
const form = document.getElementById('admissionForm');
const previewModal = document.getElementById('preview-modal');
const finalSubmitBtn = document.getElementById('final-submit-btn');

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Basic Validation
        if(!document.getElementById('declaration').checked) return alert("Please tick the declaration.");
        if(document.getElementById('photoFile').files.length === 0) return alert("Upload Photo.");
        if(document.getElementById('docFile').files.length === 0) return alert("Upload Qualification Doc.");
        const payMode = document.querySelector('input[name="payMode"]:checked').value;
        if (payMode === 'Online' && document.getElementById('payFile').files.length === 0) return alert("Upload Payment Screenshot.");

        // Read Files helper
        function getFileData(id) {
            return new Promise(resolve => {
                var el = document.getElementById(id);
                if(!el || !el.files[0]) resolve({data:null, name:null});
                else {
                    var reader = new FileReader();
                    reader.onload = e => resolve({data:e.target.result, name:el.files[0].name});
                    reader.readAsDataURL(el.files[0]);
                }
            });
        }

        const filesP = [getFileData('photoFile'), getFileData('docFile'), (payMode === 'Online')?getFileData('payFile'):Promise.resolve({data:""})];

        Promise.all(filesP).then(files => {
            // Find selected course
            let selectedCourse = "";
            document.querySelectorAll('.course-select').forEach(s => { if(s.value) selectedCourse = s.value; });

            // Build Preview (Simplified for brevity)
            const html = `<table class="preview-table">
                <tr><td class="pt-label">Student Name</td><td class="pt-val">${document.getElementsByName('studentName')[0].value}</td></tr>
                <tr><td class="pt-label">Course</td><td class="pt-val">${selectedCourse}</td></tr>
                <tr><td class="pt-label">Payment Mode</td><td class="pt-val">${payMode}</td></tr>
            </table>`;
            document.getElementById('preview-data').innerHTML = html;
            previewModal.classList.remove('hidden');

            // Handle Final Submit
            finalSubmitBtn.onclick = function() {
                this.disabled = true;
                this.querySelector('.btn-text').style.display = 'none';
                document.getElementById('final-spinner').style.display = 'block';

                const branchValue = document.getElementById('branch-select').value;
                const targetURL = (branchValue === "Arikuchi") ? URL_ARIKUCHI : URL_BAGALS;

                const formData = {
                    branch: branchValue,
                    studentName: document.getElementsByName('studentName')[0].value,
                    fatherName: document.getElementsByName('fatherName')[0].value,
                    email: document.getElementById('email-field').value,
                    contact: document.getElementsByName('contact')[0].value,
                    village: document.getElementsByName('village')[0].value,
                    po: document.getElementsByName('po')[0].value,
                    district: document.getElementsByName('district')[0].value,
                    pin: document.getElementsByName('pin')[0].value,
                    qualification: document.getElementsByName('qualification')[0].value,
                    activity: document.getElementsByName('activity')[0].value,
                    course3m: document.getElementsByName('course3m')[0].value,
                    course6m: document.getElementsByName('course6m')[0].value,
                    course1y: document.getElementsByName('course1y')[0].value,
                    courseSp: document.getElementsByName('courseSp')[0].value,
                    notes: document.getElementsByName('notes')[0].value,
                    paymentMode: payMode,
                    photoData: files[0].data, photoName: files[0].name,
                    docData: files[1].data, docName: files[1].name,
                    payData: files[2].data, payName: files[2].name
                };

                fetch(targetURL, { method: 'POST', body: JSON.stringify(formData) })
                .then(res => res.json())
                .then(data => {
                    if(data.status === 'success') {
                         document.getElementById('final-spinner').style.display = 'none';
                         // Transition to Success View
                         previewModal.classList.add('hidden');
                         document.querySelector('.glass-card').style.display = 'none';
                         const sv = document.getElementById('success-view');
                         sv.classList.remove('hidden');
                         document.getElementById('serial-display').textContent = data.serial;
                    } else {
                        alert("Failed: " + data.message);
                        location.reload();
                    }
                })
                .catch(err => { alert("Error: " + err); location.reload(); });
            };
        });
    });
}

// Close Modal Logic
document.getElementById('edit-btn').onclick = () => previewModal.classList.add('hidden');
document.getElementById('edit-btn-action').onclick = () => previewModal.classList.add('hidden');
