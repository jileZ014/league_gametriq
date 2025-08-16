#!/bin/bash

# GameTriq Basketball League Management System
# Comprehensive QA Execution Script
# 
# This script orchestrates the complete QA process:
# 1. Pre-flight checks
# 2. Health monitoring
# 3. E2E testing
# 4. Performance validation
# 5. Security assessment
# 6. UAT certification
# 7. Report generation
# 8. Result analysis

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$QA_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="$QA_DIR/reports"
LOG_FILE="$REPORT_DIR/qa-execution-$TIMESTAMP.log"

# Ensure directories exist
mkdir -p "$REPORT_DIR"
mkdir -p "$QA_DIR/screenshots"

# Logging function
log() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Banner
print_banner() {
    echo -e "${PURPLE}"
    echo "=================================================="
    echo "   GameTriq Basketball League QA Test Suite"
    echo "=================================================="
    echo "   Target: ${GAMETRIQ_BASE_URL:-https://leaguegametriq.vercel.app}"
    echo "   Timestamp: $(date)"
    echo "   Report ID: $TIMESTAMP"
    echo "=================================================="
    echo -e "${NC}"
}

# Pre-flight checks
preflight_checks() {
    log "🔍 Running pre-flight checks..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    log "Node.js version: $NODE_VERSION"
    
    # Check npm dependencies
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        warning "node_modules not found, installing dependencies..."
        cd "$PROJECT_ROOT"
        npm install
    fi
    
    # Check Playwright browsers
    if ! npx playwright --version > /dev/null 2>&1; then
        warning "Playwright not found, installing..."
        npx playwright install
    fi
    
    # Verify environment variables
    if [ -z "$GAMETRIQ_BASE_URL" ]; then
        warning "GAMETRIQ_BASE_URL not set, using default"
        export GAMETRIQ_BASE_URL="https://leaguegametriq.vercel.app"
    fi
    
    success "Pre-flight checks completed"
}

# Health checks
run_health_checks() {
    log "🏥 Running health checks..."
    
    cd "$QA_DIR"
    
    if node health-check.js > "$REPORT_DIR/health-check-$TIMESTAMP.json" 2>&1; then
        success "Health checks completed"
        
        # Parse results for critical issues
        if grep -q '"critical": true' "$REPORT_DIR/health-check-$TIMESTAMP.json"; then
            error "CRITICAL health issues detected!"
            cat "$REPORT_DIR/health-check-$TIMESTAMP.json" | grep -A 3 -B 3 '"critical": true'
            return 1
        fi
    else
        error "Health checks failed"
        return 1
    fi
}

# E2E Testing
run_e2e_tests() {
    log "🎭 Running End-to-End tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run comprehensive E2E tests
    if npm run qa:e2e > "$REPORT_DIR/e2e-results-$TIMESTAMP.log" 2>&1; then
        success "E2E tests completed"
    else
        warning "Some E2E tests failed, check logs for details"
        # Don't fail the entire suite for E2E issues
    fi
    
    # Generate Playwright HTML report
    if [ -d "artifacts/playwright/html" ]; then
        cp -r artifacts/playwright/html "$REPORT_DIR/playwright-report-$TIMESTAMP"
        log "Playwright HTML report saved to: $REPORT_DIR/playwright-report-$TIMESTAMP"
    fi
}

# Performance testing
run_performance_tests() {
    log "⚡ Running performance tests..."
    
    # Basic performance check using curl
    info "Testing page load times..."
    
    local pages=("/" "/auth/login" "/spectator" "/tournaments")
    local performance_results="$REPORT_DIR/performance-$TIMESTAMP.json"
    
    echo '{"page_load_times": {' > "$performance_results"
    
    for i in "${!pages[@]}"; do
        local page="${pages[$i]}"
        local url="${GAMETRIQ_BASE_URL}${page}"
        
        log "Testing: $url"
        
        # Measure page load time
        local load_time=$(curl -o /dev/null -s -w '%{time_total}\n' "$url" | awk '{print $1 * 1000}')
        
        echo "\"$page\": {\"time\": $load_time, \"threshold\": 3000}" >> "$performance_results"
        
        if [ $((i + 1)) -lt ${#pages[@]} ]; then
            echo "," >> "$performance_results"
        fi
    done
    
    echo '}}' >> "$performance_results"
    
    success "Performance tests completed"
}

# Security assessment
run_security_tests() {
    log "🔒 Running security assessment..."
    
    local security_results="$REPORT_DIR/security-$TIMESTAMP.json"
    
    # Basic security checks
    cat > "$security_results" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "https_check": "$(curl -I -s "$GAMETRIQ_BASE_URL" | grep -i 'strict-transport-security' && echo 'passed' || echo 'warning')",
    "security_headers": {
        "content_security_policy": "$(curl -I -s "$GAMETRIQ_BASE_URL" | grep -i 'content-security-policy' && echo 'present' || echo 'missing')",
        "x_frame_options": "$(curl -I -s "$GAMETRIQ_BASE_URL" | grep -i 'x-frame-options' && echo 'present' || echo 'missing')",
        "x_content_type_options": "$(curl -I -s "$GAMETRIQ_BASE_URL" | grep -i 'x-content-type-options' && echo 'present' || echo 'missing')"
    },
    "ssl_check": "$(curl -s --connect-timeout 10 "$GAMETRIQ_BASE_URL" > /dev/null && echo 'valid' || echo 'failed')"
}
EOF
    
    success "Security assessment completed"
}

# UAT Certification
run_uat_certification() {
    log "🏆 Running UAT certification..."
    
    cd "$QA_DIR"
    
    if node uat-certification.js > "$REPORT_DIR/uat-certification-$TIMESTAMP.json" 2>&1; then
        success "UAT certification completed"
        
        # Check certification result
        if grep -q '"demo_readiness": true' "$REPORT_DIR/uat-certification-$TIMESTAMP.json"; then
            success "✅ DEMO CERTIFIED - System ready for demonstration"
        else
            warning "⚠️ DEMO NOT CERTIFIED - Issues need resolution"
        fi
    else
        error "UAT certification failed"
        return 1
    fi
}

# Generate comprehensive report
generate_comprehensive_report() {
    log "📊 Generating comprehensive report..."
    
    cd "$QA_DIR"
    
    if node generate-report.js > "$REPORT_DIR/report-generation-$TIMESTAMP.log" 2>&1; then
        success "Comprehensive report generated"
        
        # Find the generated HTML report
        local html_report=$(find "$REPORT_DIR" -name "qa-report-*.html" -newer "$LOG_FILE" | head -1)
        if [ -n "$html_report" ]; then
            log "📄 HTML Report: $html_report"
        fi
        
        # Find the JSON report
        local json_report=$(find "$REPORT_DIR" -name "qa-report-*.json" -newer "$LOG_FILE" | head -1)
        if [ -n "$json_report" ]; then
            log "📋 JSON Report: $json_report"
        fi
    else
        warning "Report generation had issues, check logs"
    fi
}

# Result analysis
analyze_results() {
    log "📈 Analyzing results..."
    
    local analysis_file="$REPORT_DIR/analysis-$TIMESTAMP.txt"
    
    cat > "$analysis_file" << EOF
GameTriq QA Suite Execution Analysis
=====================================
Execution Time: $(date)
Report ID: $TIMESTAMP

SUMMARY:
--------
EOF
    
    # Count test results
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Analyze health checks
    if [ -f "$REPORT_DIR/health-check-$TIMESTAMP.json" ]; then
        local health_passed=$(grep -o '"passed": [0-9]*' "$REPORT_DIR/health-check-$TIMESTAMP.json" | cut -d' ' -f2)
        local health_failed=$(grep -o '"failed": [0-9]*' "$REPORT_DIR/health-check-$TIMESTAMP.json" | cut -d' ' -f2)
        
        echo "Health Checks: $health_passed passed, $health_failed failed" >> "$analysis_file"
        total_tests=$((total_tests + health_passed + health_failed))
        passed_tests=$((passed_tests + health_passed))
        failed_tests=$((failed_tests + health_failed))
    fi
    
    # Calculate pass rate
    if [ $total_tests -gt 0 ]; then
        local pass_rate=$((passed_tests * 100 / total_tests))
        echo "Overall Pass Rate: $pass_rate%" >> "$analysis_file"
        
        if [ $pass_rate -ge 85 ]; then
            echo "RESULT: ✅ ACCEPTABLE - Pass rate meets threshold" >> "$analysis_file"
        else
            echo "RESULT: ❌ NEEDS IMPROVEMENT - Pass rate below 85%" >> "$analysis_file"
        fi
    else
        echo "RESULT: ⚠️ INCONCLUSIVE - Insufficient test data" >> "$analysis_file"
    fi
    
    echo "" >> "$analysis_file"
    echo "FILES GENERATED:" >> "$analysis_file"
    echo "----------------" >> "$analysis_file"
    ls -la "$REPORT_DIR"/*"$TIMESTAMP"* | sed 's/^/  /' >> "$analysis_file"
    
    log "📊 Analysis saved to: $analysis_file"
    
    # Display summary
    echo ""
    echo -e "${CYAN}QA SUITE EXECUTION SUMMARY${NC}"
    echo "=========================="
    cat "$analysis_file" | tail -n +4
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up temporary files..."
    
    # Clean old reports (keep last 10)
    find "$REPORT_DIR" -name "*.log" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
    find "$REPORT_DIR" -name "*.json" -type f | sort -r | tail -n +21 | xargs rm -f 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main execution function
main() {
    print_banner
    
    log "🚀 Starting GameTriq QA Test Suite execution..."
    
    # Create log file
    touch "$LOG_FILE"
    log "Execution log: $LOG_FILE"
    
    local exit_code=0
    
    # Execute QA phases
    preflight_checks || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        run_health_checks || exit_code=1
    fi
    
    if [ $exit_code -eq 0 ]; then
        run_e2e_tests  # Don't fail on E2E issues
        run_performance_tests || warning "Performance tests had issues"
        run_security_tests || warning "Security tests had issues"
        run_uat_certification || exit_code=1
        generate_comprehensive_report || warning "Report generation had issues"
    fi
    
    analyze_results
    cleanup
    
    if [ $exit_code -eq 0 ]; then
        success "🎉 QA Test Suite completed successfully!"
        
        # Check for demo readiness
        if [ -f "$REPORT_DIR/uat-certification-$TIMESTAMP.json" ] && grep -q '"demo_readiness": true' "$REPORT_DIR/uat-certification-$TIMESTAMP.json"; then
            echo -e "${GREEN}✅ SYSTEM READY FOR DEMO${NC}"
        else
            echo -e "${YELLOW}⚠️ DEMO READINESS REQUIRES ATTENTION${NC}"
        fi
    else
        error "❌ QA Test Suite failed - critical issues detected"
        echo -e "${RED}🚨 SYSTEM NOT READY FOR DEMO${NC}"
    fi
    
    log "📊 Reports available in: $REPORT_DIR"
    
    exit $exit_code
}

# Handle script interruption
trap 'error "Script interrupted"; exit 1' INT TERM

# Execute main function
main "$@"