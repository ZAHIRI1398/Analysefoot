clear# Installation Windows - Football AI Backend

## Problème Python 3.14

Python 3.14 est trop récent et n'est pas compatible avec certaines dépendances (torch, numpy, etc.).

## Solution: Installer Python 3.10 ou 3.11

1. **Télécharger Python 3.10 ou 3.11**
   - Allez sur https://www.python.org/downloads/
   - Téléchargez Python 3.10.x ou 3.11.x (pas 3.12+ pour compatibilité)
   - Cochez "Add Python to PATH" lors de l'installation

2. **Vérifier l'installation**
   ```cmd
   python --version
   # Doit afficher Python 3.10.x ou 3.11.x
   ```

## Installation automatique (recommandé)

Exécutez simplement le script batch :

```cmd
install_windows.bat
```

## Installation manuelle

Si le script ne fonctionne pas, suivez ces étapes :

```cmd
cd C:\Users\KOA\Desktop\foot\backend

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement (Windows)
venv\Scripts\activate.bat

# Mettre à jour pip
python -m pip install --upgrade pip

# Installer les dépendances par groupes
pip install fastapi uvicorn[standard] python-multipart
pip install ultralytics opencv-python numpy
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install transformers Pillow websockets scikit-learn
```

## Démarrer le serveur

```cmd
# Activer l'environnement
venv\Scripts\activate.bat

# Démarrer le serveur
python main.py
```

## Alternative: Sans environnement virtuel

Si vous avez des problèmes avec venv, vous pouvez installer directement (non recommandé mais fonctionnel) :

```cmd
pip install fastapi uvicorn[standard] python-multipart
pip install ultralytics opencv-python numpy
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install transformers Pillow websockets scikit-learn

python main.py
```

## Vérifier l'installation

```cmd
python -c "import fastapi; print('FastAPI OK')"
python -c "import ultralytics; print('Ultralytics OK')"
python -c "import torch; print('PyTorch OK')"
```

## Dépannage

### Erreur "No module named"
Assurez-vous d'avoir activé l'environnement virtuel :
```cmd
venv\Scripts\activate.bat
```

### Erreur CUDA/GPU
Si vous n'avez pas de GPU NVIDIA, installez la version CPU :
```cmd
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Erreur de compatibilité
Utilisez Python 3.10 ou 3.11, pas 3.12+
