# After brew install ghidra. Add once to ~/.zshrc, then use a fresh terminal.
# Restart the harness from that terminal so its tools inherit these settings.
export GHIDRA_INSTALL_DIR="$(brew --prefix ghidra)/libexec"
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export REA_GHIDRA_STARTUP_TIMEOUT_MS=600000
# Optional for a diagnosed Objective-C analysis stall; may omit analysis:
# export REA_GHIDRA_DISABLED_ANALYZERS="Objective-C Message Analyzer"
