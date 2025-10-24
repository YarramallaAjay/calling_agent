"""
Health check script for agent container
Verifies that critical services are accessible
"""

import os
import sys


def check_environment():
    """Check that required environment variables are set"""
    required_vars = [
        "GEMINI_API_KEY",
        "LIVEKIT_URL",
        "NEXT_PUBLIC_APP_URL",
    ]

    missing = [var for var in required_vars if not os.getenv(var)]

    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        return False

    return True


def check_knowledge_base():
    """Check if knowledge base service can be initialized"""
    try:
        from knowledge_base import get_knowledge_base_service

        kb_service = get_knowledge_base_service()
        if kb_service.enabled:
            print("✅ Knowledge base service is enabled")
            return True
        else:
            print("⚠️  Knowledge base service is disabled (missing API keys)")
            # Not a failure - agent can still work without KB
            return True

    except Exception as e:
        print(f"⚠️  Knowledge base check failed: {e}")
        # Not a critical failure
        return True


def main():
    """Run health checks"""
    print("🏥 Running health checks...")

    checks = [
        ("Environment variables", check_environment),
        ("Knowledge base", check_knowledge_base),
    ]

    all_passed = True
    for name, check in checks:
        try:
            if not check():
                all_passed = False
                print(f"❌ {name} check failed")
        except Exception as e:
            print(f"❌ {name} check error: {e}")
            all_passed = False

    if all_passed:
        print("✅ All health checks passed")
        sys.exit(0)
    else:
        print("❌ Some health checks failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
