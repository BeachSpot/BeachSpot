let currentReservationCard = null;

// Função para abrir o modal
function openCancelModal(card, title) {
    currentReservationCard = card;
    const modal = document.getElementById('cancelModal');
    const message = document.getElementById('modalMessage');
    
    message.innerHTML = `Tem certeza que quer cancelar a reserva em <strong>${title}</strong>?`;
    modal.classList.add('show');
}

// Função para fechar o modal
function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    modal.classList.remove('show');
    currentReservationCard = null;
}

// Função para cancelar a reserva
function cancelReservation() {
    if (currentReservationCard) {
        const title = currentReservationCard.querySelector('.reserva-title').textContent;
        const btn = currentReservationCard.querySelector('.btn-cancelar');

        currentReservationCard.style.opacity = '0.5';
        currentReservationCard.style.transform = 'scale(0.95)';
        btn.textContent = 'Cancelada';
        btn.style.background = '#e74c3c';
        btn.disabled = true;

        setTimeout(() => {
            currentReservationCard.remove();
            showSuccessMessage(`Reserva em ${title} cancelada com sucesso!`);
        }, 2000);
    }
    closeCancelModal();
}

// Função para mostrar mensagem de sucesso
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 2000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Event listeners
document.querySelectorAll('.btn-cancelar').forEach(btn => {
    btn.addEventListener('click', function() {
        const card = this.closest('.reserva-card');
        const title = card.querySelector('.reserva-title').textContent;
        openCancelModal(card, title);
    });
});

document.getElementById('btnYes').addEventListener('click', cancelReservation);
document.getElementById('btnNo').addEventListener('click', closeCancelModal);

document.getElementById('cancelModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCancelModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCancelModal();
    }
});

// Funcionalidade da busca
const searchInput = document.querySelector('.search-box input');
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const cards = document.querySelectorAll('.reserva-card');

    cards.forEach(card => {
        const title = card.querySelector('.reserva-title').textContent.toLowerCase();
        const location = card.querySelector('.reserva-location').textContent.toLowerCase();

        if (title.includes(searchTerm) || location.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});
