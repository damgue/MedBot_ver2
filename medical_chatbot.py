import openai
import joblib
import os
from decouple import config
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from train_model import train
from functools import lru_cache
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from datetime import datetime

# CONFIGURAZIONI GENERALI
# 1. Import chiave API
openai.api_key = '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'
#OPENAI_API_KEY = config('OPENAI_API_KEY')

# Path dei modelli da creare/leggere
CURRENT_DIRECTORY = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIRECTORY, 'models', 'saved_model.pkl')
VECTORIZER_PATH = os.path.join(CURRENT_DIRECTORY, 'models', 'saved_vectorizer.pkl')

# Controllo se i file dei modelli esistono
if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
    print("I modelli non sono presenti. Avvio dell'addestramento...")
    train()

# Caricamento dei modelli
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

app = Flask(__name__)

# Configurazione di Flask per utilizzare SQLite e Flask-Login
app.config['SECRET_KEY'] = config('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = config('DATABASE_URL')

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Modello Utente per rappresentare gli utenti nel database
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    conversations = db.relationship('Conversation', backref='user', lazy=True)

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user_message = db.Column(db.String(500), nullable=False)
    bot_response = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

@lru_cache(maxsize=1000) # Meccanismo di cache
def get_chatbot_response(message):
    try:
        # Includi il messaggio dell'utente nella conversazione
        messages = [
            {"role": "system", "content": "Sei un assistente virtuale che deve assistere medici e pazienti, quindi usato esclusivamente in ambito medico, il tuo nome è MedBot. Se ti viene fatta una domanda che non c'entra con l'ambito medico, non devi assolutamente rispondere. Le tue risposte devono essere esclusivamente limitate nell'ambito medico-ospedaliero."},
            {"role": "user", "content": message}  # Aggiungi il messaggio dell'utente
        ]

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=messages
        )

        return response['choices'][0]['message']['content'].strip()
    except openai.error.RateLimitError:
        return "Limite di richieste superato. Riprova più tardi."
    except Exception as e:
        print(f"Errore: {e}")
        return "Si è verificato un errore con OpenAI."

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    error_message = None
    success_registration = False

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        existing_user = User.query.filter_by(username=username).first()

        # Controllo se il nome utente esiste già
        if existing_user:
            error_message = 'Nome utente già esistente!'
        else:
            hashed_password = generate_password_hash(password, method='sha256')
            new_user = User(username=username, password=hashed_password)
            db.session.add(new_user)
            db.session.commit()
            success_registration = True
            return render_template('register.html', success_registration=success_registration)

    return render_template('register.html', error_message=error_message)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('animation'))
        flash('Credenziali non valide. Riprova.')
    return render_template('login.html')

@app.route('/animation')
def animation():
    return render_template('animation.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/chat')
@login_required
def chat():
    conversations = Conversation.query.filter_by(user_id=current_user.id).order_by(Conversation.timestamp.desc()).all()
    for conversation in conversations:
        conversation.timestamp = conversation.timestamp.strftime('%d-%m-%Y %H:%M:%S')
    return render_template('chat.html', username=current_user.username, conversations=conversations)

@app.route("/chatbot", methods=["POST"])
@login_required
def chatbot():
    data = request.get_json()
    user_message = data["message"]

    bot_response = get_chatbot_response(user_message)

    # Salvataggio conversazione nel database
    conversation = Conversation(user_id=current_user.id, user_message=user_message, bot_response=bot_response)
    db.session.add(conversation)
    db.session.commit()

    return jsonify({"response": bot_response})

# Recupero delle conversazioni
@app.route("/get_conversations", methods=["GET"])
@login_required
def get_conversations():
    conversations = current_user.conversations.order_by(Conversation.timestamp.asc()).all()
    return jsonify([{
        'user_message': conv.user_message,
        'bot_response': conv.bot_response,
        'timestamp': conv.timestamp.strftime('%d-%m-%Y %H:%M:%S')
    } for conv in conversations])

@app.route("/save_message", methods=["POST"])
@login_required
def save_message():
    data = request.json
    new_message = Conversation(user_id=current_user.id,
                            user_message=data['user_message'],
                            bot_response=data['bot_response'], 
                            timestamp=datetime.now())
    db.session.add(new_message)
    db.session.commit()
    timestamp_str = new_message.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(success=True, message="Message saved successfully", timestamp=timestamp_str)

# Eliminazione cronologia chat
@app.route('/delete_chat_history', methods=['POST'])
@login_required
def delete_chat_history():
    try:
        Conversation.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify(success=True)
    except Exception as e:
        print(f"Errore durante l'eliminazione della cronologia dei messaggi: {e}")
        return jsonify(success=False, error=str(e))

@app.route('/get_logged_in_username', methods=['GET'])
@login_required
def get_logged_in_username():
    return jsonify(username=current_user.username)
    
# Inizializzazione del database e creazione di un utente di test con variabili di default
with app.app_context():
    db.create_all()
    test_user = User.query.filter_by(username="testuser").first()
    if not test_user:
        hashed_password = generate_password_hash("testpassword", method='sha256')
        new_user = User(username="testuser", password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

if __name__ == "__main__":
    app.run(debug=True)
