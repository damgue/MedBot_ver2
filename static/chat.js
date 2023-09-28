let isMuted = false; //controllo suono di notifica

//riproduce un suono quando arriva un nuovo messaggio
function playMessageSound() {
    if (!isMuted) {
        document.getElementById('messageSound').play();
    }
}

//salva il messaggio e lo aggiunge alla cronologia
function saveMessageAndAddToSidenav(userMessage, botResponse) {
    //chiamata API per salvare il messaggio
    fetch('/save_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            user_message: userMessage, 
            bot_response: botResponse 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let sidenav = document.getElementById('sidenav');
            let messageDiv = document.createElement('div');
            messageDiv.className = 'sidenav-message';

            let chatMessageBlock = document.createElement('div');
            chatMessageBlock.className = 'chat-message-block';

            let timestampDiv = document.createElement('div');
            timestampDiv.className = 'chat-timestamp';

            let chatMessageContent = document.createElement('div');
            chatMessageContent.className = 'chat-message-content';
            chatMessageContent.innerText = userMessage;

            chatMessageBlock.appendChild(timestampDiv);
            chatMessageBlock.appendChild(chatMessageContent);
            messageDiv.appendChild(chatMessageBlock);
            sidenav.appendChild(messageDiv);
            toggleDeleteButton();
        } else {
            console.error("Errore nel salvataggio del messaggio nel database:", data.error);
        }
    })
    .catch(error => {
        console.error("Errore nella comunicazione con il server:", error);
    });
}

//aggiunge il messaggio alla chat
function addMessageToChat(sender, message) {
    let chatbox = document.querySelector('.messages-container');
    let messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    let iconDiv = document.createElement('div');
    iconDiv.className = 'icon';

    let balloonDiv = document.createElement('div');
    balloonDiv.className = 'balloon';
    balloonDiv.innerText = message;

    if (sender === 'Tu') {
        messageDiv.classList.add('user-message');
        iconDiv.innerText = 'TU';
    } else {
        messageDiv.classList.add('chatbot-message');
        iconDiv.innerText = 'MB';
    }

    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(balloonDiv);
    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight; // Autoscroll

    playMessageSound(); //riproduce il suono di notifica
}

//mostra l'indicatore di caricamento
function showLoadingSpinner() {
    document.getElementById('typingIndicator').style.display = 'block'; // Mostra "MedBot sta scrivendo..."
    document.querySelector('.input-group-append button').disabled = true;

    let userInputField = document.getElementById('userInput');
    userInputField.setAttribute('data-isloading', 'true');
}

//nasconde l'indicatore di caricamento
function hideLoadingSpinner() {
    document.getElementById('typingIndicator').style.display = 'none'; // Nascondi "MedBot sta scrivendo..."
    document.querySelector('.input-group-append button').disabled = false;

    let userInputField = document.getElementById('userInput');
    userInputField.removeAttribute('data-isloading');
}

//invia il messaggio al chat e ottiene la risposta
function sendMessage() {
    let userInputField = document.getElementById('userInput');
    let userMessage = userInputField.value;

    if (userMessage.trim() === '') {
        return;
    }

    addMessageToChat('Tu', userMessage);
    userInputField.value = '';
    showLoadingSpinner();

    fetch('/chatbot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage })
    })
    .then(response => response.json())
    .then(data => {
        hideLoadingSpinner();
        if (data.response) {
            addMessageToChat('Chatbot', data.response);
            saveMessageAndAddToSidenav(userMessage, data.response);
        }
    })
    .catch(error => {
        hideLoadingSpinner();
        console.error("Errore nella comunicazione con il chatbot:", error);
        addMessageToChat('Chatbot', 'Mi dispiace, non sono riuscito a elaborare la tua richiesta. Riprova più tardi.');
    });
}

//attiva o disattiva il suono di notifica
function toggleMute() {
    isMuted = !isMuted;
    let btn = document.getElementById('muteButton');
    let icon = btn.querySelector('i');

    if (isMuted) {
        // Icona per notifiche disattivate
        icon.className = 'fas fa-volume-mute';
        // Cambia il testo del tooltip
        btn.setAttribute('data-original-title', 'Attiva notifiche'); 
    } else {
        // Icona per notifiche attivate
        icon.className = 'fas fa-volume-up';   
        // Cambia il testo del tooltip
        btn.setAttribute('data-original-title', 'Disattiva notifiche'); 
    }
}

//mostra o nasconde la barra laterale
function toggleSidenav() {
    let sidenav = document.getElementById('sidenav');
    let sidenavButton = document.getElementById('sidenavToggle');

    if (sidenav.style.left === "0px" || sidenav.style.left === "") {
        sidenav.style.left = "-275px";
        sidenavButton.style.left = "0px";
    } else {
        sidenav.style.left = "0px";
        sidenavButton.style.left = "275px";
    }
}

function toggleDeleteButton() {
    const sidenavItems = document.querySelectorAll('.sidenav .sidenav-message');
    const deleteButton = document.getElementById('deleteHistoryButton');
    if (sidenavItems.length > 0) {
        deleteButton.style.display = 'block';
    } else {
        deleteButton.style.display = 'none';
    }
}

//visualizza il messaggio di benvenuto
function fetchAndDisplayWelcomeMessage() {
    fetch('/get_logged_in_username')
        .then(response => response.json())
        .then(data => {
            const username = data.username;
		console.log(data);
            addMessageToChat('Chatbot', 'Ciao ' + username + ', sono MedBot, il medico bot pronto ad assisterti! Come posso aiutarti?');
        })
        .catch(error => {
            console.error("Errore nel recupero del nome utente:", error);
        });
}

document.getElementById('deleteHistoryButton').addEventListener('click', function() {
    let confirmation = confirm("Sei sicuro di voler eliminare la cronologia delle chat?");
    if (confirmation) {
        fetch('/delete_chat_history', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let sidenav = document.getElementById('sidenav');
                while (sidenav.firstChild) {
                    sidenav.removeChild(sidenav.firstChild);
                }
                alert("Cronologia delle chat eliminata con successo!");
            } else {
                alert("Errore durante l'eliminazione della cronologia delle chat: " + data.error);
            }
        })
        .catch(error => {
            console.error("Errore nella comunicazione con il server:", error);
            alert("Errore durante l'eliminazione della cronologia delle chat.");
        });
    }
});

//eventi al caricamento della pagina
document.addEventListener('DOMContentLoaded', (event) => {
    const sendButton = document.getElementById('sendMsgButton');
    const muteButton = document.getElementById('muteButton');
    const sidenavButton = document.getElementById("sidenavToggle");
    
    sidenavButton.addEventListener("click", toggleSidenav);
    document.getElementById('sidenav').style.left = "-275px";

    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    if (muteButton) {
        muteButton.addEventListener('click', toggleMute);
    }

    const userInputField = document.getElementById('userInput');
    userInputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            if (!userInputField.hasAttribute('data-isloading')) {
                e.preventDefault();
                sendMessage();
            }
        }
    });

    fetchAndDisplayWelcomeMessage();

    $('[data-toggle="tooltip"]').tooltip();
    $('#infoButton').tooltip();
});
