# Contributing to Proxy Smart

We welcome contributions to the Proxy Smart project! By contributing, you help improve healthcare interoperability for everyone.

## 📋 Contributor License Agreement (CLA)

To maintain our dual licensing model and ensure we can provide both open source and commercial versions, all contributors must agree to the following terms:

### By submitting a contribution, you agree that:

1. **License Grant**: You grant Maximilian Nussbaumer and the Proxy Smart project a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable license to:

   - Use, reproduce, modify, and distribute your contributions
   - Sublicense your contributions under any license (including proprietary licenses)
   - Incorporate your contributions into both open source and commercial versions
2. **Ownership**: You retain copyright ownership of your contributions, but grant the above licensing rights
3. **Original Work**: You confirm that your contributions are your original work or you have the right to submit them
4. **No Obligations**: You are not obligated to provide support for your contributions

## 🚀 How to Contribute

### 1. Clone the Repository

```bash
git clone https://github.com/quotentiroler/proxy-smart
cd proxy-smart
```

### 2. Create a Development Branch

Create a branch starting with `dev/` followed by your feature name:

```bash
git checkout -b dev/your-feature-name
git checkout -b dev/fix-authentication
git checkout -b dev/add-oauth-metrics
```

### 3. Make Your Changes

- Follow our coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 4. Push Your Branch

```bash
git add .
git commit -m "Add OAuth metrics dashboard with real-time monitoring"
git push origin dev/your-feature-name
```

### 5. Automated Pipeline

Our CI/CD pipeline will automatically:

- ✅ Run tests and quality checks
- 📝 Generate a commit summary comment
- 📋 Include your changes in the changelog
- 🔄 Handle the PR creation

### 6. Include CLA Agreement

Include this line in your commit message:

```
Signed-off-by: Your Name <your.email@example.com>

I agree to the Contributor License Agreement as outlined in CONTRIBUTING.md
```

## � Branch Naming Convention

Use the `dev/*` prefix for all development branches:

```bash
dev/feature-name          # ✅ Good
dev/bug-fix               # ✅ Good  
dev/oauth-improvements    # ✅ Good
dev/ui-dashboard-update   # ✅ Good

feature/something         # ❌ Won't trigger pipeline
fix/bug                   # ❌ Won't trigger pipeline
develop                   # ❌ Protected branch
main                      # ❌ Protected branch
```

## 🛠 Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow existing code formatting
- Use the bun run generate:ui:normalized script to generate client APIs for the backend

### Testing

- Write unit tests for new features
- Ensure existing tests still pass
- Test in both browser and Node.js environments

### Documentation

- Update docs if needed
- Add inline code comments for complex logic

## 🤝 Code of Conduct

- Be respectful and professional
- Focus on constructive feedback
- Help create an inclusive environment
- Remember we're all working toward better healthcare technology

## 📞 Questions?

If you have questions about contributing or the CLA:

- 📧 Email: max@maxwerbung.com
- 💬 Open a GitHub Discussion
- 🐛 Create an issue for bugs

---

## Why the CLA?

The CLA allows us to:

- ✅ Maintain both open source and commercial versions
- ✅ Provide flexibility for healthcare organizations
- ✅ Ensure long-term project sustainability
- ✅ Protect contributors and users legally

Thank you for contributing to healthcare interoperability! 🏥💙
