#!/bin/bash

# ===============================================
# Devopsians Deployment Script with Environment Detection
# ===============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect environment
detect_environment() {
    print_info "Detecting deployment environment..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_warning ".env file not found!"
        
        # Try to detect based on hostname or other factors
        HOSTNAME=$(hostname)
        
        if [[ "$HOSTNAME" == *"prod"* ]] || [[ "$HOSTNAME" == *"production"* ]]; then
            DETECTED_ENV="production"
        elif [[ "$HOSTNAME" == *"staging"* ]] || [[ "$HOSTNAME" == *"stg"* ]]; then
            DETECTED_ENV="staging"
        else
            DETECTED_ENV="development"
        fi
        
        print_info "Detected environment: $DETECTED_ENV"
        
        # Ask user for confirmation
        read -p "Use $DETECTED_ENV environment? (y/n) [default: y]: " confirm
        confirm=${confirm:-y}
        
        if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
            ENV_FILE=".env.$DETECTED_ENV"
        else
            read -p "Enter environment (development/staging/production): " user_env
            ENV_FILE=".env.$user_env"
        fi
        
        if [ -f "$ENV_FILE" ]; then
            print_info "Copying $ENV_FILE to .env"
            cp "$ENV_FILE" .env
        else
            print_error "Environment file $ENV_FILE not found!"
            print_info "Please create .env file manually or copy from .env.example"
            exit 1
        fi
    else
        print_success "Found existing .env file"
        source .env
        print_info "Environment: ${DEPLOY_ENV:-unknown}"
    fi
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed!"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Pull latest images
pull_images() {
    print_info "Pulling latest Docker images..."
    docker-compose pull || docker compose pull
    print_success "Images pulled successfully"
}

# Stop existing containers
stop_containers() {
    print_info "Stopping existing containers..."
    docker-compose down || docker compose down || true
    print_success "Containers stopped"
}

# Start containers
start_containers() {
    print_info "Starting containers..."
    docker-compose up -d || docker compose up -d
    print_success "Containers started successfully"
}

# Show status
show_status() {
    print_info "Container Status:"
    docker-compose ps || docker compose ps
    
    echo ""
    print_info "Waiting for services to be healthy..."
    sleep 5
    
    # Check health
    docker-compose ps || docker compose ps
    
    echo ""
    print_success "Deployment completed!"
    echo ""
    print_info "Access your application:"
    source .env
    echo "  Frontend: http://localhost:${FRONTEND_PORT:-80}"
    echo "  Backend:  http://localhost:${BACKEND_PORT:-3030}"
    echo "  MongoDB:  mongodb://localhost:${MONGO_PORT:-27017}"
}

# Show logs
show_logs() {
    print_info "Showing logs (Ctrl+C to exit)..."
    docker-compose logs -f || docker compose logs -f
}

# Main deployment flow
main() {
    echo ""
    echo "=========================================="
    echo "  Devopsians Deployment Script"
    echo "=========================================="
    echo ""
    
    # Parse arguments
    SHOW_LOGS=false
    for arg in "$@"; do
        case $arg in
            --logs)
                SHOW_LOGS=true
                shift
                ;;
            --help)
                echo "Usage: ./deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --logs    Show container logs after deployment"
                echo "  --help    Show this help message"
                echo ""
                exit 0
                ;;
        esac
    done
    
    detect_environment
    check_prerequisites
    stop_containers
    pull_images
    start_containers
    show_status
    
    if [ "$SHOW_LOGS" = true ]; then
        show_logs
    fi
}

# Run main function
main "$@"
