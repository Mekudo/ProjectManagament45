function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function initModalSwitchers() {
    const signupLink = document.getElementById('open-signup');
    if (signupLink) {
        signupLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal('sign-in-wrapper');
            openModal('sign-up-wrapper');
        });
    }
    
    const signinLink = document.getElementById('open-signin');
    if (signinLink) {
        signinLink.addEventListener('click', function(e) {
            e.preventDefault();
            closeModal('sign-up-wrapper');
            openModal('sign-in-wrapper');
        });
    }
}

document.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        const modalId = e.target.id;
        if (modalId) {
            closeModal(modalId);
        }
    }
});