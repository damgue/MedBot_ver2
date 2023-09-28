# MedBot_ver2
MedBot senza apprendimento automatico, modifiche nella configurazione delle API di ChatGPT

**** ISTRUZIONI PER CONFIGURARE E AVVIARE IL CHATBOT ****

# Requisiti di sistema
	Python 3.x
	
-----------------------------------------------------------------------------------------------------------------------------

# Se Python non è installato
	Andare nel seguente link https://www.python.org/downloads/ e scaricare la versione adatta per il proprio sistema operativo

	Nel caso di pc Windows, è necessario aggiungere manualmente il path all'interno delle varibili di ambiente:
		1) copiare il path in cui è stato installato Python; solitamente C:\Users\User\AppData\Local\Programs\Python\Python3x
		2) su start cercare "Modifica le variabili di ambiente relative al sistema" e aprire il risultato
		3) cliccare su "Variabili d'ambiente..."
		4) creare una nuova variabile d'ambiente e nel campo "Valore variabile:" inserire il path precedentemente incollato

-----------------------------------------------------------------------------------------------------------------------------

# Verificare che Python è stato installato
	Aprire il terminale o il cdm ed eseguire il seguente comando:
		Windows: python --version
		MacOS: python3 --version

-----------------------------------------------------------------------------------------------------------------------------

# Installazione delle librerie Python
	Eseguire il seguente comando per installare tutte le librerie Python necessarie:

	pip install openai joblib python-decouple Flask Flask-SQLAlchemy Werkzeug Flask-Login pandas scikit-learn

-----------------------------------------------------------------------------------------------------------------------------

# Avvio del progetto
	Una volta installate tutte le librerie necessarie, tramite il terminale/cmd recarsi nella cartella dove è stato estratto il progetto.

	Es:
	cd Desktop/chatbot
	python3 medical_chatbot.py

-----------------------------------------------------------------------------------------------------------------------------

# Primo accesso
	Se nel database non vi sono utenti, verrà creato un utente di default con le seguenti credenziali: testuser / testpassword

-----------------------------------------------------------------------------------------------------------------------------

# Dati nascosti
	I seguenti tre parametri 
		1. OPENAI_API_KEY
		2. SECRET_KEY
		3. DATABASE_URL
	è possibile modificarli dal file .env
