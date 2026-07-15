# k6 Performance Testing Suite - convenience targets
#
# Usage:
#   make smoke                 # run smoke on the default test (booking-flow)
#   make load TEST=booking-read
#   make run TYPE=spike TEST=booking-flow
#   make stress VUS=100        # override peak VUs
#   make dash TYPE=load        # live web dashboard while running
#   make ENVIRONMENT=staging load
#
# Variables:
#   TEST        test file name (without path/extension) in tests/  (default: booking-flow)
#   TYPE        test type: smoke|load|stress|spike|soak|breakpoint (default: smoke)
#   ENVIRONMENT target environment defined in config/environments.js (default: prod)
#   VUS         override peak VU count (optional; blank = profile default)
#   DASH_PORT   port for the `dash` web dashboard (default: 5665)

TEST ?= booking-flow
TYPE ?= smoke
ENVIRONMENT ?= prod
VUS ?=
DASH_PORT ?= 5665
K6 ?= k6

# Only pass -e VUS when a value is provided (blank = use the profile default).
VUS_FLAG = $(if $(strip $(VUS)),-e VUS=$(strip $(VUS)),)
BASE_FLAGS = -e ENVIRONMENT=$(ENVIRONMENT) $(VUS_FLAG)

.PHONY: help ui run dash smoke load stress spike soak breakpoint read health clean

UI_PORT ?= 8080

help:
	@echo "k6 Performance Testing Suite"
	@echo ""
	@echo "Targets:"
	@echo "  make ui        # open the web test-runner UI at http://127.0.0.1:$(UI_PORT)"
	@echo "  make smoke|load|stress|spike|soak|breakpoint [TEST=<file>] [VUS=<n>]"
	@echo "  make run TYPE=<type> TEST=<file> [VUS=<n>]"
	@echo "  make dash TYPE=<type> TEST=<file> [VUS=<n>]  # live web dashboard at :$(DASH_PORT)"
	@echo "  make read      # read-heavy test (load profile)"
	@echo "  make health    # /ping health check (smoke profile)"
	@echo "  make clean     # remove generated reports"
	@echo ""
	@echo "Variables: TEST=$(TEST) TYPE=$(TYPE) ENVIRONMENT=$(ENVIRONMENT) VUS=$(VUS)"

ui:
	UI_PORT=$(UI_PORT) DASH_PORT=$(DASH_PORT) K6=$(K6) node runner/server.js

run:
	$(K6) run -e TEST_TYPE=$(TYPE) -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

# Run with k6's built-in real-time web dashboard.
# Opens live charts at http://127.0.0.1:$(DASH_PORT) during the run and exports
# a self-contained HTML dashboard to reports/ when it finishes.
dash:
	K6_WEB_DASHBOARD=true \
	K6_WEB_DASHBOARD_PORT=$(DASH_PORT) \
	K6_WEB_DASHBOARD_OPEN=true \
	K6_WEB_DASHBOARD_EXPORT=reports/$(TEST)-$(TYPE)-dashboard.html \
	$(K6) run -e TEST_TYPE=$(TYPE) -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

smoke:
	$(K6) run -e TEST_TYPE=smoke -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

load:
	$(K6) run -e TEST_TYPE=load -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

stress:
	$(K6) run -e TEST_TYPE=stress -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

spike:
	$(K6) run -e TEST_TYPE=spike -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

soak:
	$(K6) run -e TEST_TYPE=soak -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

breakpoint:
	$(K6) run -e TEST_TYPE=breakpoint -e TEST_FILE=$(TEST) $(BASE_FLAGS) tests/$(TEST).js

read:
	$(K6) run -e TEST_TYPE=load -e TEST_FILE=booking-read $(BASE_FLAGS) tests/booking-read.js

health:
	$(K6) run -e TEST_TYPE=smoke -e TEST_FILE=health $(BASE_FLAGS) tests/health.js

clean:
	rm -f reports/*.html reports/*.xml reports/*.json
