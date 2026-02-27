/* ===== PAGE ADMIN TOURNOIS & LIVES ===== */
.tournois-page {
    --primary: #551B8C;
    --primary-light: #7e3db0;
    --primary-dark: #3d1266;
    --gold: #FFCC00;
    --gold-dark: #e6b800;
    --bg-light: #F0F8FF;
    --white: #ffffff;
    --dark: #1a1a1a;
    --gray: #6c757d;
    --light-gray: #e9ecef;
    --shadow: 0 10px 30px rgba(0,0,0,0.05);
    --shadow-hover: 0 15px 40px rgba(85,27,140,0.15);
    --transition: all 0.3s ease;
}

.tournois-page h1 {
    color: var(--primary);
    font-size: 2.2rem;
    margin-bottom: 30px;
    position: relative;
    padding-bottom: 10px;
}
.tournois-page h1::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 80px;
    height: 4px;
    background: var(--gold);
    border-radius: 2px;
}

.tournois-page .admin-card {
    background: var(--white);
    border-radius: 20px;
    padding: 25px;
    box-shadow: var(--shadow);
    border: 1px solid var(--light-gray);
    transition: var(--transition);
    margin-bottom: 30px;
}
.tournois-page .admin-card:hover {
    box-shadow: var(--shadow-hover);
}

.tournois-page .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
}
.tournois-page .card-header h2 {
    color: var(--primary);
    font-size: 1.6rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.tournois-page .card-header h2 i {
    color: var(--gold);
}

.tournois-page .btn-add,
.tournois-page .btn-edit-live {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 50px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    box-shadow: 0 4px 10px rgba(85,27,140,0.2);
}
.tournois-page .btn-add:hover,
.tournois-page .btn-edit-live:hover {
    background: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(85,27,140,0.3);
}
.tournois-page .btn-edit-live {
    background: #17a2b8;
}
.tournois-page .btn-edit-live:hover {
    background: #138496;
}

/* Affichage des infos live */
.tournois-page .live-info-display {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    border-left: 5px solid var(--gold);
}
.tournois-page .live-info-display p {
    margin: 8px 0;
    font-size: 1rem;
}
.tournois-page .live-info-display .live-active {
    color: #28a745;
    font-weight: 600;
}
.tournois-page .live-info-display .live-inactive {
    color: #dc3545;
    font-weight: 600;
}

/* Liste des tournois */
.tournois-page .admin-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.tournois-page .list-item {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-left: 5px solid var(--gold);
    transition: var(--transition);
    border: 1px solid var(--light-gray);
    flex-wrap: wrap;
    gap: 15px;
}
.tournois-page .list-item:hover {
    transform: translateX(5px);
    box-shadow: var(--shadow);
    border-color: var(--primary);
}
.tournois-page .list-item .info {
    flex: 2;
    min-width: 300px;
}
.tournois-page .list-item .info strong {
    color: var(--primary);
    font-size: 1.1rem;
    display: block;
    margin-bottom: 5px;
}
.tournois-page .list-item .info .details {
    color: var(--gray);
    font-size: 0.9rem;
    line-height: 1.5;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.tournois-page .list-item .info .details span {
    background: rgba(85,27,140,0.05);
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid var(--light-gray);
}
.tournois-page .list-item .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    background: var(--gold);
    color: black;
}
.tournois-page .list-item .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
}
.tournois-page .list-item .actions button {
    background: none;
    border: none;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: var(--transition);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.tournois-page .list-item .actions button.edit {
    color: var(--primary);
    background: rgba(85,27,140,0.1);
}
.tournois-page .list-item .actions button.edit:hover {
    background: var(--primary);
    color: white;
}
.tournois-page .list-item .actions button.delete {
    color: #dc3545;
    background: rgba(220,53,69,0.1);
}
.tournois-page .list-item .actions button.delete:hover {
    background: #dc3545;
    color: white;
}

/* Modales */
.tournois-page .admin-modal {
    display: none;
    position: fixed;
    z-index: 2000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
}
.tournois-page .admin-modal.active {
    display: flex;
}
.tournois-page .modal-content {
    background: var(--white);
    border-radius: 20px;
    padding: 30px;
    width: 90%;
    max-width: 600px;
    position: relative;
    box-shadow: 0 20px 40px rgba(85,27,140,0.2);
    border: 1px solid var(--gold);
    animation: modalFadeIn 0.3s ease;
    max-height: 80vh;
    overflow-y: auto;
}
@keyframes modalFadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}
.tournois-page .close {
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 2rem;
    cursor: pointer;
    color: var(--gray);
    transition: var(--transition);
}
.tournois-page .close:hover {
    color: var(--primary);
}
.tournois-page .modal-content h3 {
    color: var(--primary);
    font-size: 1.8rem;
    margin-bottom: 20px;
    border-left: 5px solid var(--gold);
    padding-left: 15px;
}

.tournois-page .form-group {
    margin-bottom: 20px;
}
.tournois-page .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--dark);
}
.tournois-page .form-group input,
.tournois-page .form-group select,
.tournois-page .form-group textarea {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid var(--light-gray);
    border-radius: 10px;
    font-family: 'Poppins', sans-serif;
    font-size: 1rem;
    transition: var(--transition);
}
.tournois-page .form-group input:focus,
.tournois-page .form-group select:focus,
.tournois-page .form-group textarea:focus {
    border-color: var(--primary);
    outline: none;
    box-shadow: 0 0 0 3px rgba(85,27,140,0.1);
}
.tournois-page .btn-submit {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    font-size: 1.1rem;
    cursor: pointer;
    transition: var(--transition);
    margin-top: 10px;
}
.tournois-page .btn-submit:hover {
    background: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(85,27,140,0.3);
}

.tournois-page .no-data {
    text-align: center;
    color: var(--gray);
    padding: 40px;
    font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 768px) {
    .tournois-page h1 {
        font-size: 1.8rem;
    }
    .tournois-page .card-header {
        flex-direction: column;
        align-items: flex-start;
    }
    .tournois-page .list-item {
        flex-direction: column;
        align-items: flex-start;
    }
    .tournois-page .list-item .actions {
        align-self: flex-end;
    }
}