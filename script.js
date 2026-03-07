document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const tableContainer = document.getElementById('table-container');
    const cartBody = document.getElementById('cart-body');
    const statsContainer = document.getElementById('stats-container');
    const filterContainer = document.getElementById('filter-container');
    const debugModeToggle = document.getElementById('debug-mode-toggle');
    const filterPartsOnlyToggle = document.getElementById('filter-parts-only');
    const statItems = document.getElementById('stat-items');
    const statStores = document.getElementById('stat-stores');
    const statParts = document.getElementById('stat-parts');
    const statIssues = document.getElementById('stat-issues');
    const statRecommendations = document.getElementById('stat-recommendations');
    
    let recommendationsCount = 0;

    // Handle debug mode toggle
    debugModeToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('debug-mode', e.target.checked);
    });

    // Handle parts only toggle
    filterPartsOnlyToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('filter-parts-only', e.target.checked);
    });

    const getAllLegoPricesBtn = document.getElementById('get-all-lego-prices-btn');
    if (getAllLegoPricesBtn) {
        getAllLegoPricesBtn.addEventListener('click', async () => {
            const buttons = document.querySelectorAll('.search-lego-price-btn');
            getAllLegoPricesBtn.disabled = true;
            getAllLegoPricesBtn.textContent = 'Fetching...';
            let rateLimitHit = false;
            for (const btn of buttons) {
                // If it's already disabled, it means we clicked it or it's currently fetching
                if (!btn.disabled && btn.fetchLegoPrice) {
                    const success = await btn.fetchLegoPrice();
                    if (success === false) {
                        rateLimitHit = true;
                        break;
                    }
                    // Small delay to prevent rate limiting
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            if (rateLimitHit) {
                getAllLegoPricesBtn.textContent = 'Get All LEGO Prices';
                getAllLegoPricesBtn.disabled = false;
                alert('Rate limit reached (429). Batch paused. Please wait a moment and click again to continue.');
            } else {
                getAllLegoPricesBtn.textContent = 'Done!';
            }
        });
    }

    const downloadCsvBtn = document.getElementById('download-csv-btn');
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', () => {
            const cheaperRows = document.querySelectorAll('tr.row-cheaper');
            const partsMapBS = {};
            const partsMapS = {};

            for (const row of cheaperRows) {
                const elementId = row.getAttribute('data-cheapest-element-id');
                const channel = row.getAttribute('data-cheapest-channel');
                // The quantity is the 3rd cell (index 2)
                const quantityText = row.children[2].textContent;
                const quantity = parseInt(quantityText) || 0;
                
                if (elementId && quantity > 0) {
                    if (channel === 'pab') { // Bestseller
                        partsMapBS[elementId] = (partsMapBS[elementId] || 0) + quantity;
                    } else { // Standard (bap or other)
                        partsMapS[elementId] = (partsMapS[elementId] || 0) + quantity;
                    }
                }
            }

            const bsEntries = Object.entries(partsMapBS).map(([id, qty]) => ({id, qty}));
            const sEntries = Object.entries(partsMapS).map(([id, qty]) => ({id, qty}));

            const numBsChunks = Math.ceil(bsEntries.length / 200) || 1;
            const numSChunks = Math.ceil(sEntries.length / 200) || 1;
            const maxChunks = Math.max(numBsChunks, numSChunks);

            const chunkArray = (arr, numChunks) => {
                if (numChunks <= 1) return [arr];
                const chunkSize = Math.ceil(arr.length / numChunks);
                const chunks = [];
                for (let i = 0; i < numChunks; i++) {
                    chunks.push(arr.slice(i * chunkSize, (i + 1) * chunkSize));
                }
                return chunks;
            };

            const bsChunks = chunkArray(bsEntries, numBsChunks);
            const sChunks = chunkArray(sEntries, numSChunks);

            for (let i = 0; i < maxChunks; i++) {
                let csvContent = "elementId,quantity\r\n";
                const currentBs = bsChunks[i] || [];
                const currentS = sChunks[i] || [];
                
                for (const entry of currentBs) {
                    csvContent += `${entry.id},${entry.qty}\r\n`;
                }
                for (const entry of currentS) {
                    csvContent += `${entry.id},${entry.qty}\r\n`;
                }

                // Skip downloading if chunk is completely empty (can happen if no recommendations at all)
                if (currentBs.length === 0 && currentS.length === 0) continue;

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('href', url);
                const suffix = maxChunks > 1 ? `_${i + 1}` : '';
                a.setAttribute('download', `pick_a_brick_recommendations${suffix}.csv`);
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
    }

    const downloadCartBtn = document.getElementById('download-cart-btn');
    if (downloadCartBtn) {
        downloadCartBtn.addEventListener('click', () => {
            const nonCheaperRows = document.querySelectorAll('#cart-body tr:not(.row-cheaper)');
            const records = [];
            for (const row of nonCheaperRows) {
                if (!row.hasAttribute('data-prefix')) continue;
                
                const prefix = row.getAttribute('data-prefix');
                const storeId = row.getAttribute('data-store-id');
                const lotId = row.getAttribute('data-lot-id');
                const quantity = row.getAttribute('data-quantity');
                
                records.push(`${prefix}:${storeId}:${lotId}:${quantity}`);
            }
            
            const asciiData = records.join('\n');
            let hexString = '';
            for (let i = 0; i < asciiData.length; i++) {
                let hex = asciiData.charCodeAt(i).toString(16).toUpperCase();
                if (hex.length === 1) hex = '0' + hex;
                hexString += hex;
            }
            
            const blob = new Blob([hexString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('href', url);
            a.setAttribute('download', 'filtered_cart.cart');
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

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
        
        let issuesCount = 0;
        statIssues.textContent = '0';
        recommendationsCount = 0;
        statRecommendations.textContent = '0';
        
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
                
                // Save original cart data to attributes for re-export
                tr.setAttribute('data-prefix', item.prefix || '');
                tr.setAttribute('data-store-id', item.store_id || '');
                tr.setAttribute('data-lot-id', item.lot_id || '');
                tr.setAttribute('data-quantity', item.quantity || '');

                // Staggered animation delay
                tr.style.animation = `fadeIn 0.3s ease forwards ${index * 0.02}s`;
                tr.style.opacity = '0';
                
                // Escape HTML to prevent XSS
                tr.innerHTML = `
                    <td class="col-debug">${escapeHTML(item.store_id)}</td>
                    <td class="col-debug"><code style="background: rgba(0,0,0,0.2)">${escapeHTML(item.lot_id)}</code></td>
                    <td>${escapeHTML(item.quantity)}</td>
                    <td class="item-type"></td>
                    <td class="item-condition"></td>
                    <td class="item-color"></td>
                    <td class="item-description"></td>
                    <td class="item-design-id"></td>
                    <td class="item-price"></td>
                    <td class="item-lego-price"></td>
                `;
                cartBody.appendChild(tr);

                // Fetch extra details
                fetch(`https://store.bricklink.com/ajax/clone/store/item.ajax?invID=${encodeURIComponent(item.lot_id)}&sid=${encodeURIComponent(item.store_id)}&wantedMoreArrayID=`)
                    .then(res => {
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        return res.json();
                    })
                    .then(data => {
                        let isEmpty = true;
                        if(data) {
                            tr.setAttribute('data-item-type', data.itemType || '');
                            const typeMap = { 'P': 'Part', 'M': 'Minifig', 'S': 'Set', 'I': 'Instruction' };
                            const condMap = { 'U': 'Used', 'N': 'New' };
                            tr.querySelector('.item-type').textContent = typeMap[data.itemType] || data.itemType || '';
                            tr.querySelector('.item-condition').textContent = condMap[data.invNew] || data.invNew || '';
                            if (data.colorName !== undefined) {
                                tr.querySelector('.item-color').textContent = data.colorName;
                            }
                            tr.querySelector('.item-description').textContent = data.itemName || '';
                            tr.querySelector('.item-design-id').textContent = data.itemNo || '';
                            tr.querySelector('.item-price').textContent = data.nativePrice || '';
                            
                            // Check if the data actually contained item info
                            if (data.itemType || data.itemName || data.itemNo) {
                                isEmpty = false;
                            }
                        }
                        
                        const legoPriceTd = tr.querySelector('.item-lego-price');
                        if (!isEmpty && data && data.itemType === 'P') {
                            const btn = document.createElement('button');
                            btn.textContent = 'Search';
                            btn.className = 'search-lego-price-btn';
                            btn.fetchLegoPrice = async () => {
                                btn.textContent = '...';
                                btn.disabled = true;
                                try {
                                    const elIds = await searchElementIds(data.itemNo, data.colorName);
                                    if (elIds.length > 0) {
                                        const finalResults = [];
                                        for (const elId of elIds) {
                                            try {
                                                const res = await getLegoStoreResult(elId);
                                                if (res) finalResults.push(res);
                                            } catch (e) {
                                                if (e.message === 'RATE_LIMIT_429') throw e;
                                                console.error('Error fetching lego store result for', elId, e);
                                            }
                                        }
                                        if (finalResults.length === 0) {
                                            legoPriceTd.textContent = 'Not Available';
                                        } else if (finalResults.length === 1) {
                                            const res = finalResults[0];
                                            const formattedPrice = res.price?.formattedAmount || 'N/A';
                                            const parsedPrice = extractPrice(formattedPrice);
                                            
                                            let channelStr = 'XX';
                                            if (res.deliveryChannel === 'pab') channelStr = 'BS';
                                            else if (res.deliveryChannel === 'bap') channelStr = 'S';
                                            const elementIdStr = escapeHTML(String(res.id));
                                            const link = `<a href="https://www.lego.com/en-us/pick-and-build/pick-a-brick?query=${elementIdStr}" target="_blank" style="color: #60a5fa; text-decoration: none;">${elementIdStr}</a>`;
                                            legoPriceTd.innerHTML = `${link} - ${escapeHTML(String(formattedPrice))} - ${channelStr}`;

                                            const pricePerStr = tr.querySelector('.item-price').textContent;
                                            const pricePerFloat = extractPrice(pricePerStr);
                                            
                                            if (parsedPrice !== null && pricePerFloat !== null && parsedPrice < pricePerFloat) {
                                                tr.setAttribute('data-cheapest-element-id', res.id);
                                                tr.setAttribute('data-cheapest-channel', res.deliveryChannel || '');
                                                if (!tr.classList.contains('row-cheaper')) {
                                                    tr.classList.add('row-cheaper');
                                                    recommendationsCount++;
                                                    statRecommendations.textContent = recommendationsCount;
                                                }
                                            }
                                        } else {
                                            // Handle multiple matches
                                            tr.classList.add('row-error');
                                            issuesCount++;
                                            statIssues.textContent = issuesCount;
                                            
                                            let isCurrentlyIssue = true;
                                            let isCurrentlyCheaper = false;
                                            const radioGroupName = `pab-select-${data.itemNo}-${Math.random().toString(36).substr(2, 9)}`;
                                            const container = document.createElement('div');
                                            container.style.display = 'flex';
                                            container.style.flexDirection = 'column';
                                            container.style.gap = '4px';

                                            const pricePerStr = tr.querySelector('.item-price').textContent;
                                            const pricePerFloat = extractPrice(pricePerStr);

                                            finalResults.forEach(res => {
                                                const formattedPrice = res.price?.formattedAmount || 'N/A';
                                                const parsedPrice = extractPrice(formattedPrice);
                                                
                                                let channelStr = 'XX';
                                                if (res.deliveryChannel === 'pab') channelStr = 'BS';
                                                else if (res.deliveryChannel === 'bap') channelStr = 'S';
                                                const elementIdStr = escapeHTML(String(res.id));
                                                const link = `<a href="https://www.lego.com/en-us/pick-and-build/pick-a-brick?query=${elementIdStr}" target="_blank" style="color: #60a5fa; text-decoration: none;">${elementIdStr}</a>`;
                                                
                                                const label = document.createElement('label');
                                                label.style.display = 'flex';
                                                label.style.alignItems = 'center';
                                                label.style.gap = '8px';
                                                label.style.cursor = 'pointer';
                                                
                                                const radio = document.createElement('input');
                                                radio.type = 'radio';
                                                radio.name = radioGroupName;
                                                radio.value = res.id;
                                                
                                                radio.addEventListener('change', () => {
                                                    if (isCurrentlyIssue) {
                                                        isCurrentlyIssue = false;
                                                        tr.classList.remove('row-error');
                                                        issuesCount--;
                                                        statIssues.textContent = issuesCount;
                                                    }
                                                    
                                                    tr.setAttribute('data-cheapest-element-id', res.id);
                                                    tr.setAttribute('data-cheapest-channel', res.deliveryChannel || '');
                                                    
                                                    if (parsedPrice !== null && pricePerFloat !== null && parsedPrice < pricePerFloat) {
                                                        if (!isCurrentlyCheaper) {
                                                            isCurrentlyCheaper = true;
                                                            tr.classList.add('row-cheaper');
                                                            recommendationsCount++;
                                                            statRecommendations.textContent = recommendationsCount;
                                                        }
                                                    } else {
                                                        if (isCurrentlyCheaper) {
                                                            isCurrentlyCheaper = false;
                                                            tr.classList.remove('row-cheaper');
                                                            recommendationsCount--;
                                                            statRecommendations.textContent = recommendationsCount;
                                                        }
                                                    }
                                                });
                                                
                                                const textSpan = document.createElement('span');
                                                textSpan.innerHTML = `${link} - ${escapeHTML(String(formattedPrice))} - ${channelStr}`;
                                                
                                                label.appendChild(radio);
                                                label.appendChild(textSpan);
                                                container.appendChild(label);
                                            });
                                            legoPriceTd.innerHTML = '';
                                            legoPriceTd.appendChild(container);
                                        }
                                    } else {
                                        legoPriceTd.textContent = 'None';
                                    }
                                } catch (e) {
                                    if (e.message === 'RATE_LIMIT_429') {
                                        console.warn('Rate limit hit inside Search button');
                                        btn.textContent = 'Search';
                                        btn.disabled = false;
                                        return false;
                                    }
                                    console.error('Error', e);
                                    legoPriceTd.textContent = 'Error';
                                }
                                return true;
                            };
                            btn.onclick = btn.fetchLegoPrice;
                            legoPriceTd.appendChild(btn);
                        } else {
                            legoPriceTd.textContent = 'N/A';
                        }
                        
                        if (isEmpty) {
                            console.warn('Empty row data retrieved for lot_id:', item.lot_id, 'store_id:', item.store_id, 'Response:', data);
                            issuesCount++;
                            statIssues.textContent = issuesCount;
                            tr.classList.add('row-error');
                            tr.querySelector('.item-description').innerHTML = '<em>This inventory item is no longer available</em>';
                        }
                    })
                    .catch(err => {
                        console.error(`Error fetching item details for lot_id: ${item.lot_id}, store_id: ${item.store_id}`, err);
                        issuesCount++;
                        statIssues.textContent = issuesCount;
                        tr.classList.add('row-error');
                        tr.querySelector('.item-description').innerHTML = '<em>This inventory item is no longer available</em>';
                    });
            });
        }
        
        tableContainer.style.display = 'block';
        statsContainer.style.display = 'grid';
        filterContainer.style.display = 'flex';
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    function extractPrice(str) {
        if (!str) return null;
        const match = String(str).match(/\d+\.\d+/);
        if (match) {
            return parseFloat(match[0]);
        }
        // Fallback for integer prices
        const intMatch = String(str).match(/\d+/);
        if (intMatch) {
            return parseFloat(intMatch[0]);
        }
        return null;
    }

    async function searchElementIds(designId, targetColorName) {
        if (!targetColorName) return [];
        
        try {
            const bricklinkUrl = `https://www.bricklink.com/catalogColors.asp?itemType=P&itemNo=${designId}`;
            const url = `https://corsproxy.io/?${encodeURIComponent(bricklinkUrl)}`;
            const response = await fetch(url);
            if (response.status === 429) {
                throw new Error('RATE_LIMIT_429');
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const tables = doc.querySelectorAll('center > table');
            let colorTable = null;
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                const prev = table.previousElementSibling;
                if (prev && prev.tagName.toLowerCase() === 'p') {
                    colorTable = table;
                    break;
                }
            }
            
            if (!colorTable) return [];
            
            const elementIds = [];
            const rows = colorTable.querySelectorAll('tr');
            for (let i = 0; i < rows.length; i++) {
                const data = rows[i].querySelectorAll('td');
                if (data.length < 5) continue;
                
                const colorName = data[3].textContent.trim().replace(/\u00A0/g, '');
                if (colorName === targetColorName) {
                    const elementId = data[4].textContent.trim().replace(/\u00A0/g, '');
                    if (elementId && !elementIds.includes(elementId)) {
                        elementIds.push(elementId);
                    }
                }
            }
            return elementIds;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    const LEGO_QUERY = `
query PickABrickQuery($input: ElementQueryInput!) {
  searchElements(input: $input) {
    results {
      ...ElementLeaf
    }
    total
    count
  }
}
fragment ElementLeaf on SearchResultElement {
  id
  maxOrderQuantity
  deliveryChannel
  price {
    formattedAmount
    currencyCode
  }
}
`;

    async function getLegoStoreResult(elementId) {
        const url = 'https://corsproxy.io/?' + encodeURIComponent('https://www.lego.com/api/graphql/PickABrickQuery');
        const jsonBody = {
            operationName: "PickABrickQuery",
            variables: { input: { perPage: 10, query: String(elementId) } },
            query: LEGO_QUERY
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jsonBody)
            });
            
            if (response.status === 429) {
                throw new Error('RATE_LIMIT_429');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseJson = await response.json();
            const results = responseJson.data?.searchElements?.results || [];
            if (results.length < 1) {
                console.warn(`Did not receive result for element ID: ${elementId}`);
                return null;
            }
            console.log(`Received ${results.length} results for element ID: ${elementId}, returning the first one.`);
            return results[0];
        } catch (err) {
            console.error(err);
            throw err;
        }
    }
});
