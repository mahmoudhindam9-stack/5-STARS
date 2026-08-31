# Five Stars

POS and inventory management system for Five Stars electrical supplies store.

## Current capabilities
- Arabic RTL dashboard and responsive POS
- USB/Bluetooth barcode scanning and camera scanning where supported
- Sales with cash/card/credit payment methods
- Held and restored carts
- Customer balances, statements, and debt payments
- Inventory with units, categories, low-stock alerts, and movement history
- Sales invoices and printable reports
- Expense tracking and account summaries
- User roles: manager, cashier, inventory, accounting
- JSON backup export/import
- Offline-first local storage with automatic bidirectional Supabase synchronization
- Windows desktop application shell with professional splash screen
- Windows installer with Desktop shortcut and automatic uninstall cleanup

## Deployment
Static frontend deployment on Vercel. The Windows version is packaged with Electron and preserves the same Five Stars application and synchronization layer locally.

## Windows installer
The GitHub Actions workflow `.github/workflows/build-installers.yml` builds an x64 installer named `Five Stars SETUP.exe` using Electron Builder. Installation creates a Desktop shortcut named `Five Stars`; the installed application registers `Five Stars UNINSTALL.exe` and removes application data on uninstall.

The installer build also generates the Windows icon from `electron/icon.svg` during CI so the repository stays text/binary-friendly.

<!-- deployment-refresh: framework preset is Other; force Vercel redeploy -->
