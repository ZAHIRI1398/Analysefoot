@echo off
REM Script d'installation pour Windows - Football AI Backend

echo ========================================
echo Football AI Backend - Installation Windows
echo ========================================
echo.

REM Vérifier Python
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python n'est pas installe ou pas dans le PATH
    echo Veuillez installer Python 3.10 ou 3.11 depuis https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo Creation de l'environnement virtuel...
python -m venv venv

echo.
echo Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

echo.
echo Mise a jour de pip et setuptools...
python -m pip install --upgrade pip setuptools wheel

echo.
echo Installation des dependances...
echo Ceci peut prendre plusieurs minutes...
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 python-multipart==0.0.6
pip install pydantic==2.5.3 pydantic-core==2.14.6
pip install ultralytics==8.0.206 opencv-python==4.8.1.78 numpy==1.24.3
pip install torch==2.1.0 torchvision==0.16.0 --index-url https://download.pytorch.org/whl/cpu
pip install transformers==4.35.0 Pillow==10.1.0 websockets==12.0 scikit-learn==1.3.2

echo.
echo ========================================
echo Installation terminee!
echo ========================================
echo.
echo Pour demarrer le serveur:
echo   1. Activer l'environnement: venv\Scripts\activate.bat
echo   2. Lancer: python main.py
echo.
pause
