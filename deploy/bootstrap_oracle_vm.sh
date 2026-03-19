#!/usr/bin/env bash
set -euo pipefail

echo "Atualizando pacotes..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release ufw

echo "Instalando Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Configurando usuario para executar Docker sem sudo..."
sudo usermod -aG docker "$USER"

echo "Abrindo portas HTTP e SSH no firewall local..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw --force enable

echo ""
echo "Bootstrap finalizado."
echo "Saia e entre novamente na VM para aplicar o grupo docker."
