import re

def fix(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    content = re.sub(r'// Auth state.*?const fetchShopCategories = async \(\) => \{', 'const fetchShopCategories = async () => {', content, flags=re.DOTALL)
    
    with open(filename, 'w') as f:
        f.write(content)

for p in ['SuperAdminDashboard', 'AdminDashboard', 'CustomerView']:
    fix(f'src/pages/{p}.jsx')

