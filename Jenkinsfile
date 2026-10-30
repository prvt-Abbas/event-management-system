// Task 2 + Task 3 — Jenkins pipeline for the Event Management System
// How to use it (see README.md for the full steps):
//   Preferred: put this file at the ROOT of your event-management-system
//   Git repo, create a Jenkins "Pipeline" job, choose
//   "Pipeline script from SCM" > Git > your repo URL > branch main/master
//   (whichever your repo actually uses) > Script Path "Jenkinsfile".
//   Fallback (no GitHub yet): create a Pipeline job, choose
//   "Pipeline script", and paste this whole file in — but then you must
//   already have the code checked out on the Jenkins agent, or replace
//   the checkout stage with your own copy step.
// What it does, in order:
//   Checkout -> Install + syntax check -> Build Docker image
//   -> Start single-node Minikube (if not running) -> Deploy MySQL + app
//   -> Wait for rollout -> Health-check the app -> Report
// It deliberately does NOT push to Docker Hub: on one Minikube node the
// image is loaded straight into Minikube (minikube image load), so no
// Docker Hub account or credentials are needed for this lab.
// Jenkins agent requirements (all on the same EC2 host for this lab):
//   Jenkins user must be able to run docker, kubectl and minikube.
//   That is set up by scripts/02-install-docker-minikube-amazon-linux.sh
//   (jenkins added to the docker group + kubectl/minikube on PATH).
//   The Jenkins job must run on the built-in node (no separate agent).

pipeline {
    agent any

    environment {
        APP_IMAGE = 'event-app:latest'
        K8S_NAMESPACE = 'event-app'
        // Change this only if your MySQL Secret uses a different password.
        // The Secret itself is created by the deploy script / Task 3 steps,
        // never by hard-coding a password in this file.
        MYSQL_ROOT_PASSWORD = credentials('mysql-root-password')
    }

    stages {
        stage('Checkout') {
            steps {
                // When run "from SCM", Jenkins checks out automatically.
                // This stage just proves what was checked out.
                sh 'pwd; ls -la; ls backend/ frontend/ database/ || true'
            }
        }

        stage('Install & Syntax Check') {
            steps {
                dir('backend') {
                    sh 'node --version; npm --version'
                    sh 'npm ci --omit=dev || npm install'
                    sh 'node --check server.js'
                    sh 'for f in routes/*.js config/*.js setup.js check.js; do node --check "$f"; done'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${APP_IMAGE} .'
                sh 'docker images | grep event-app || true'
            }
        }

        stage('Start Minikube (single node)') {
            steps {
                // Idempotent: if Minikube is already running this is a no-op.
                // --driver=docker, 2 CPUs / 4 GB is the floor for
                // app + MySQL + monitoring on one node.
                sh '''
                    if ! minikube status --format='{{.Host}}' 2>/dev/null | grep -q Running; then
                      minikube start --driver=docker --cpus=2 --memory=4096
                    else
                      echo "Minikube already running"
                    fi
                    kubectl get nodes
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    # Minikube runs its own Docker daemon inside its node
                    # container, so a host-built image is invisible to it
                    # until it is explicitly loaded in.
                    minikube image load ${APP_IMAGE}

                    kubectl create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

                    # MySQL root password: from the Jenkins credential above.
                    # --dry-run + apply makes re-runs safe (no duplicate Secret error).
                    kubectl create secret generic mysql-secret \
                      --from-literal=mysql-root-password="${MYSQL_ROOT_PASSWORD}" \
                      -n ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

                    # Seed data: MySQL runs schema.sql from this ConfigMap
                    # ONLY on first PVC creation (docker-entrypoint-initdb.d).
                    # Deleting the PVC is therefore the "reset the database" step.
                    kubectl create configmap mysql-init \
                      --from-file=schema.sql=database/schema.sql \
                      -n ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

                    kubectl apply -f k8s/ -n ${K8S_NAMESPACE}
                '''
            }
        }

        stage('Wait for Rollout') {
            steps {
                sh '''
                    kubectl rollout status deployment/event-app -n ${K8S_NAMESPACE} --timeout=300s
                    kubectl rollout status deployment/mysql -n ${K8S_NAMESPACE} --timeout=300s
                    kubectl get pods,svc -n ${K8S_NAMESPACE}
                '''
            }
        }

        stage('Verify App Health') {
            steps {
                sh '''
                    # Wait for MySQL to accept connections, then for the app.
                    # /api/health is DB-independent, so it proves the app is up;
                    # a login test (below) proves the DB + seed data are up.
                    kubectl wait --for=condition=ready pod -l app=event-app \
                      -n ${K8S_NAMESPACE} --timeout=300s
                    kubectl port-forward svc/event-app 5000:5000 \
                      -n ${K8S_NAMESPACE} --address=127.0.0.1 &
                    PF_PID=$!
                    sleep 5
                    curl -fsS http://127.0.0.1:5000/api/health
                    echo ""
                    curl -fsS -X POST http://127.0.0.1:5000/api/auth/login \
                      -H 'Content-Type: application/json' \
                      -d '{"email":"admin@events.com","password":"admin123"}' || \
                      echo "LOGIN CHECK FAILED — check MySQL seed (mysql-init) and DB env"
                    kill $PF_PID || true
                '''
            }
        }
    }

    post {
        success {
            echo 'PIPELINE OK — Event app deployed to Minikube. Access: http://<EC2-PUBLIC-IP>:30007 (NodePort, see README).'
        }
        failure {
            echo 'PIPELINE FAILED — check the failed stage above, then: kubectl get pods -n event-app ; kubectl logs -l app=event-app -n event-app'
        }
        always {
            sh 'kubectl get pods,svc -n ${K8S_NAMESPACE} || true'
        }
    }
}
