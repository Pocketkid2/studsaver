document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const tableContainer = document.getElementById('table-container');
    const cartBody = document.getElementById('cart-body');
    const statsContainer = document.getElementById('stats-container');
    const statItems = document.getElementById('stat-items');
    const statStores = document.getElementById('stat-stores');
    const statParts = document.getElementById('stat-parts');

    // Make clicking the upload zone trigger the file input
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle drag and drop events
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Handle file selection from input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
            // Reset input so the same file could be selected again if needed
            fileInput.value = '';
        }
    });

    function handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.cart')) {
            alert('Please upload a .cart file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const hexString = e.target.result;
            try {
                const items = parseCartData(hexString.trim());
                displayItems(items);
            } catch (error) {
                console.error(error);
                alert('Failed to parse the file. Ensure it is a valid BrickLink cart file.');
            }
        };
        reader.onerror = () => {
            alert('Error reading file.');
        };
        // The python code reads the string (which is hex) as text
        reader.readAsText(file);
    }

    function parseCartData(hexString) {
        // Remove whitespace and newlines just in case
        const cleanHex = hexString.replace(/\s+/g, '');
        
        // Convert hex to ASCII
        let asciiData = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
            const hexByte = cleanHex.substring(i, i + 2);
            asciiData += String.fromCharCode(parseInt(hexByte, 16));
        }
        
        // Split by lines and parse records
        const records = asciiData.trim().split('\n');
        const cartItems = [];
        
        for (const record of records) {
            const parts = record.split(':');
            if (parts.length >= 4) {
                cartItems.push({
                    prefix: parts[0],
                    store_id: parts[1],
                    lot_id: parts[2],
                    quantity: parts[3]
                });
            }
        }
        
        return cartItems;
    }

    function displayItems(items) {
        cartBody.innerHTML = '';
        
        const numItems = items.length;
        const uniqueStores = new Set(items.map(i => i.store_id)).size;
        const totalParts = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);
        
        statItems.textContent = numItems;
        statStores.textContent = uniqueStores;
        statParts.textContent = totalParts;
        
        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-muted); padding: 3rem;">No items found in the cart.</td>`;
            cartBody.appendChild(tr);
        } else {
            items.forEach((item, index) => {
                const tr = document.createElement('tr');
                // Staggered animation delay
                tr.style.animation = `fadeIn 0.3s ease forwards ${index * 0.02}s`;
                tr.style.opacity = '0';
                
                // Escape HTML to prevent XSS
                tr.innerHTML = `
                    <td><strong>${escapeHTML(item.prefix)}</strong></td>
                    <td>${escapeHTML(item.store_id)}</td>
                    <td><code style="background: rgba(0,0,0,0.2)">${escapeHTML(item.lot_id)}</code></td>
                    <td>${escapeHTML(item.quantity)}</td>
                    <td class="item-type"></td>
                    <td class="item-condition"></td>
                    <td class="item-color"></td>
                    <td class="item-description"></td>
                    <td class="item-design-id"></td>
                    <td class="item-price"></td>
                `;
                cartBody.appendChild(tr);

                // Fetch extra details
                fetch(`https://store.bricklink.com/ajax/clone/store/item.ajax?invID=${encodeURIComponent(item.lot_id)}&sid=${encodeURIComponent(item.store_id)}&wantedMoreArrayID=`)
                    .then(res => res.json())
                    .then(data => {
                        if(data) {
                            tr.querySelector('.item-type').textContent = data.itemType || '';
                            tr.querySelector('.item-condition').textContent = data.invNew || '';
                            if (data.colorName !== undefined) {
                                tr.querySelector('.item-color').textContent = data.colorName;
                            }
                            tr.querySelector('.item-description').textContent = data.itemName || '';
                            tr.querySelector('.item-design-id').textContent = data.itemNo || '';
                            tr.querySelector('.item-price').textContent = data.nativePrice || '';
                        }
                    })
                    .catch(err => console.error('Error fetching item details:', err));
            });
        }
        
        tableContainer.style.display = 'block';
        statsContainer.style.display = 'grid';
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }
});
