# Run app

* Create .env
DB_HOST=
USER_NAME=
PASSWORD=
DATABASE=
* Install dependencies: npm i
* Run app: npm start

# Install software in EC2 Amazon Linux

* Install nodejs: sudo yum install -y nodejs
* Install git: sudo yum install -y git
* Install mysql shell: sudo yum dnf install -y mariadb105

# Mysql Shell Commands

* Check verion: mysql --version
* Connect to RDS: mysql -h <rds-endpoint> -P <port> -u <user-name> -p
* List all DB: show databases;
* Create DB: create <db-name>;
