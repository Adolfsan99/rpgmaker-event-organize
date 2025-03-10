document.addEventListener('DOMContentLoaded', () => {
    // Clear localStorage at the start
    //localStorage.removeItem('eventosData');

    const separadorContainer = document.getElementById('separador-container');
    const addSeparadorBtn = document.getElementById('add-separador-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');

    // Prompt function for user input
    function promptUser(message, defaultValue = '') {
        return new Promise((resolve) => {
            const promptDialog = document.createElement('div');
            promptDialog.classList.add('prompt-dialog');
            promptDialog.innerHTML = `
                <div class="prompt-dialog-content">
                    <p>${message}</p>
                    <input type="text" class="prompt-input" value="${defaultValue}">
                    <div class="prompt-dialog-buttons">
                        <button class="prompt-confirm">Confirmar</button>
                        <button class="prompt-cancel">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(promptDialog);

            const input = promptDialog.querySelector('.prompt-input');
            const confirmBtn = promptDialog.querySelector('.prompt-confirm');
            const cancelBtn = promptDialog.querySelector('.prompt-cancel');

            confirmBtn.addEventListener('click', () => {
                const value = input.value.trim();
                document.body.removeChild(promptDialog);
                resolve(value || null); // Return null if empty
            });

            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(promptDialog);
                resolve(null); // Return null on cancel
            });

            input.focus();
        });
    }

    // Confirmation dialog function
    function showConfirmDialog(message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.classList.add('confirm-dialog');
            dialog.innerHTML = `
                <div class="confirm-dialog-content">
                    <p>${message}</p>
                    <div class="confirm-dialog-buttons">
                        <button class="confirm-yes">Sí</button>
                        <button class="confirm-no">No</button>
                    </div>
                </div>
            `;
            document.body.appendChild(dialog);

            const yesBtn = dialog.querySelector('.confirm-yes');
            const noBtn = dialog.querySelector('.confirm-no');

            yesBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(true);
            });

            noBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false);
            });
        });
    }

    // Create Rename Button
    function createRenameButton(element, currentText, renameCallback) {
        const renameBtn = document.createElement('button');
        renameBtn.textContent = '✎';
        renameBtn.classList.add('rename-btn');
        renameBtn.addEventListener('click', async () => {
            // Get the most current text directly from the element before prompting
            const mostCurrentText = element.querySelector('span')?.textContent.trim() || currentText;
            const newName = await promptUser('Introduce un nuevo nombre:', mostCurrentText);
            if (newName && newName !== mostCurrentText) {
                renameCallback(newName);
                saveToLocalStorage();
            }
        });
        return renameBtn;
    }

    // Create Delete Button
    function createDeleteButton(elementToDelete, deleteCallback) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', async () => {
            const confirmDelete = await showConfirmDialog('¿Estás seguro de que quieres eliminar esto?');
            if (confirmDelete && elementToDelete.parentNode) {  // Check if parent exists
                try {
                    deleteCallback();
                    saveToLocalStorage();
                } catch (error) {
                    console.error('Error deleting element:', error);
                }
            }
        });
        return deleteBtn;
    }

    // Create Separador
    async function createSeparador(data = null) {
        const separadorName = data ? data.header : await promptUser('Nombre del Separador:', 'Nuevo Separador');
        if (separadorName === null) return null; // Don't create if cancelled
        
        const separador = document.createElement('div');
        separador.classList.add('separador', 'draggable');
        
        const separadorHeader = document.createElement('div');
        separadorHeader.classList.add('separador-header');
        
        const separadorTitle = document.createElement('span');
        separadorTitle.textContent = separadorName;

        const separadorHeaderActions = document.createElement('div');
        separadorHeaderActions.classList.add('separador-header-actions');

        // Rename Separador Button
        const renameSeparadorBtn = createRenameButton(
            separadorHeader, 
            separadorName, 
            (newName) => {
                separadorTitle.textContent = newName;
            }
        );

        // Delete Separador Button
        const deleteSeparadorBtn = createDeleteButton(separador, () => {
            separadorContainer.removeChild(separador);
        });

        // Add Evento button
        const addEventoBtn = document.createElement('button');
        addEventoBtn.textContent = '+';
        addEventoBtn.classList.add('mini-btn');
        addEventoBtn.addEventListener('click', async () => {
            const evento = await createEvento(separador, null);
            if (evento) {
                saveToLocalStorage();
            }
        });

        separadorHeaderActions.appendChild(renameSeparadorBtn);
        separadorHeaderActions.appendChild(deleteSeparadorBtn);
        separadorHeaderActions.appendChild(addEventoBtn);
        
        separadorHeader.appendChild(separadorTitle);
        separadorHeader.appendChild(separadorHeaderActions);
        separador.appendChild(separadorHeader);

        const eventosContainer = document.createElement('div');
        eventosContainer.classList.add('eventos-container');
        
        // Add drop zone functionality
        eventosContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement && draggingElement.classList.contains('evento-with-variables')) {
                e.dataTransfer.dropEffect = 'move';
            }
        });

        eventosContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement && draggingElement.classList.contains('evento-with-variables')) {
                const afterElement = getEventoDragAfterElement(eventosContainer, e.clientY);
                if (afterElement) {
                    eventosContainer.insertBefore(draggingElement, afterElement);
                } else {
                    eventosContainer.appendChild(draggingElement);
                }
                saveToLocalStorage();
            }
        });

        separador.appendChild(eventosContainer);

        // If data is provided, recreate eventos and variables
        if (data && data.eventos) {
            for (const eventoData of data.eventos) {
                await createEvento(separador, eventoData);
            }
        }

        separadorContainer.appendChild(separador);
        setupSeparadorDraggable(separador);
        saveToLocalStorage();
        return separador;
    }

    // Create Evento
    async function createEvento(separador, data = null) {
        const eventoName = data ? data.evento : await promptUser('Nombre del Evento:', 'Nuevo Evento');
        if (eventoName === null) return null; // Don't create if cancelled
        
        const eventosContainer = separador.querySelector('.eventos-container');
        const eventoWithVariables = document.createElement('div');
        eventoWithVariables.classList.add('evento-with-variables');
        
        const nuevoEvento = document.createElement('div');
        nuevoEvento.classList.add('evento', 'draggable');
        
        const eventoNombre = document.createElement('div');
        eventoNombre.classList.add('evento-nombre');
        
        const eventoTitle = document.createElement('span');
        eventoTitle.textContent = eventoName;
        eventoNombre.appendChild(eventoTitle);

        const eventoActions = document.createElement('div');
        eventoActions.classList.add('evento-actions');

        // Rename Evento Button
        const renameEventoBtn = createRenameButton(
            eventoNombre, 
            eventoName, 
            (newName) => {
                eventoTitle.textContent = newName;
            }
        );

        // Delete Evento Button
        const deleteEventoBtn = createDeleteButton(eventoWithVariables, () => {
            eventosContainer.removeChild(eventoWithVariables);
        });

        const variablesForEvento = document.createElement('div');
        variablesForEvento.classList.add('variables-for-evento');

        // Create a separate container for variables
        const variablesContainer = document.createElement('div');
        variablesContainer.classList.add('variables-list');

        // Create a separate container for the add button
        const variableAddContainer = document.createElement('div');
        variableAddContainer.classList.add('variable-add-container');

        // Add Variable button
        const addVariableBtn = document.createElement('button');
        addVariableBtn.textContent = '+';
        addVariableBtn.classList.add('mini-btn');
        addVariableBtn.addEventListener('click', async () => {
            const variable = await createVariable(variablesContainer);
            if (variable) {
                saveToLocalStorage();
            }
        });

        // Append the new containers
        variableAddContainer.appendChild(addVariableBtn);
        variablesForEvento.appendChild(variablesContainer);
        variablesForEvento.appendChild(variableAddContainer);

        // If data is provided, recreate variables
        if (data && data.variables) {
            for (const varData of data.variables) {
                await createVariable(variablesContainer, varData);
            }
        }

        eventoActions.appendChild(renameEventoBtn);
        eventoActions.appendChild(deleteEventoBtn);
        eventoNombre.appendChild(eventoActions);
        
        nuevoEvento.appendChild(eventoNombre);
        eventoWithVariables.appendChild(nuevoEvento);
        eventoWithVariables.appendChild(variablesForEvento);
        
        // Insert at the beginning of the container
        if (eventosContainer.firstChild) {
            eventosContainer.insertBefore(eventoWithVariables, eventosContainer.firstChild);
        } else {
            eventosContainer.appendChild(eventoWithVariables);
        }

        setupEventoDraggable(nuevoEvento, eventosContainer);

        saveToLocalStorage();
        return eventoWithVariables;
    }

    // Create Variable
    async function createVariable(variablesContainer, data = null) {
        const variableName = data ? data : await promptUser('Nombre de la Variable:', 'Nueva Variable');
        if (variableName === null) return null; // Don't create if cancelled

        const nuevaVariable = document.createElement('div');
        nuevaVariable.classList.add('variable', 'draggable');
        
        const variableTitle = document.createElement('span');
        variableTitle.textContent = variableName;
        nuevaVariable.appendChild(variableTitle);

        // Rename Variable Button
        const renameVariableBtn = createRenameButton(
            nuevaVariable, 
            variableName, 
            (newName) => {
                variableTitle.textContent = newName;
            }
        );

        // Delete Variable Button - Modified to remove the entire wrapper
        const deleteVariableBtn = createDeleteButton(nuevaVariable, () => {
            const wrapper = nuevaVariable.closest('.variable-wrapper');
            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            }
        });

        const variableWrapper = document.createElement('div');
        variableWrapper.classList.add('variable-wrapper');
        variableWrapper.appendChild(nuevaVariable);
        variableWrapper.appendChild(renameVariableBtn);
        variableWrapper.appendChild(deleteVariableBtn);
        
        setupVariableDraggable(nuevaVariable, variablesContainer);
        
        // Append to the variables container
        variablesContainer.appendChild(variableWrapper);
        saveToLocalStorage();
        return nuevaVariable;
    }

    // Make element editable
    function makeEditable(element) {
        element.classList.add('editable');
        element.setAttribute('contenteditable', 'true');
        
        element.addEventListener('blur', () => {
            // Trim whitespace and ensure not empty
            const newText = element.textContent.trim();
            element.textContent = newText || element.dataset.defaultText;
            saveToLocalStorage();
        });

        element.addEventListener('keydown', (e) => {
            // Prevent new lines
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            }
        });
    }

    // Load existing data from localStorage
    function loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('eventosData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                parsedData.forEach(separadorData => createSeparador(separadorData));
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            // If there's an error loading, clear the corrupted data
            localStorage.removeItem('eventosData');
        }
    }

    // Save to localStorage
    function saveToLocalStorage() {
        try {
            const separadores = Array.from(document.querySelectorAll('.separador')).map(separador => {
                return {
                    header: separador.querySelector('.separador-header span').textContent.trim(),
                    eventos: Array.from(separador.querySelectorAll('.evento-with-variables')).map(eventoWithVars => {
                        return {
                            evento: eventoWithVars.querySelector('.evento-nombre span').textContent.trim(),
                            variables: Array.from(eventoWithVars.querySelectorAll('.variable span'))
                                .map(v => v.textContent.trim())
                        };
                    })
                };
            });
            
            localStorage.setItem('eventosData', JSON.stringify(separadores));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    function setupSeparadorDraggable(separador) {
        separador.setAttribute('draggable', 'true');

        separador.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', 'separador');
            separador.classList.add('dragging');
        });

        separador.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            // Only allow if dragging another separador
            if (draggingElement && draggingElement.classList.contains('separador')) {
                e.dataTransfer.dropEffect = 'move';
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
        });

        separador.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement && draggingElement.classList.contains('separador')) {
                const separadorContainer = document.getElementById('separador-container');
                const afterElement = getDragAfterElement(separadorContainer, e.clientY);
                if (afterElement) {
                    separadorContainer.insertBefore(draggingElement, afterElement);
                } else {
                    separadorContainer.appendChild(draggingElement);
                }
                saveToLocalStorage();
            }
        });

        separador.addEventListener('dragend', () => {
            separador.classList.remove('dragging');
        });
    }

    function setupEventoDraggable(evento, parentContainer) {
        const eventoWithVariables = evento.closest('.evento-with-variables');
        const eventoNombre = evento.querySelector('.evento-nombre');
        
        // Make only the title bar draggable
        eventoNombre.setAttribute('draggable', 'true');

        eventoNombre.addEventListener('dragstart', (e) => {
            eventoWithVariables.classList.add('dragging');
            e.stopPropagation();
            e.dataTransfer.setData('type', 'evento');
        });

        eventoNombre.addEventListener('dragend', () => {
            eventoWithVariables.classList.remove('dragging');
        });

        // Remove the old dragover listener from parentContainer
        // Instead, add dragover listeners to all eventos-container elements
        document.querySelectorAll('.eventos-container').forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingElement = document.querySelector('.dragging');
                if (!draggingElement || !draggingElement.classList.contains('evento-with-variables')) return;

                const afterElement = getEventoDragAfterElement(container, e.clientY);
                if (afterElement && afterElement !== draggingElement) {
                    container.insertBefore(draggingElement, afterElement);
                } else if (!afterElement && draggingElement !== container.lastChild) {
                    container.appendChild(draggingElement);
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggingElement = document.querySelector('.dragging');
                if (draggingElement && draggingElement.classList.contains('evento-with-variables')) {
                    const afterElement = getEventoDragAfterElement(container, e.clientY);
                    if (afterElement) {
                        container.insertBefore(draggingElement, afterElement);
                    } else {
                        container.appendChild(draggingElement);
                    }
                    saveToLocalStorage();
                }
            });
        });
    }

    function setupVariableDraggable(variable, parentContainer) {
        const variableWrapper = variable.closest('.variable-wrapper');
        variable.setAttribute('draggable', 'true');

        variable.addEventListener('dragstart', (e) => {
            variableWrapper.classList.add('dragging');
            e.stopPropagation();
        });

        variable.addEventListener('dragend', () => {
            variableWrapper.classList.remove('dragging');
        });

        parentContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement || !draggingElement.classList.contains('variable-wrapper')) return;

            const afterElement = getVariableDragAfterElement(parentContainer, e.clientY);
            if (afterElement && afterElement !== variableWrapper) {
                parentContainer.insertBefore(draggingElement, afterElement);
            } else if (!afterElement && draggingElement !== parentContainer.lastChild) {
                parentContainer.appendChild(draggingElement);
            }
            saveToLocalStorage();
        });
    }

    function getEventoDragAfterElement(container, y) {
        const draggableElements = [...container.children].filter(child => 
            !child.classList.contains('dragging') && 
            child.classList.contains('evento-with-variables')
        );

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function getVariableDragAfterElement(container, y) {
        const draggableElements = [...container.children].filter(child => 
            !child.classList.contains('dragging') && 
            child.classList.contains('variable-wrapper')
        );

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.children].filter(child => {
            return child !== document.querySelector('.dragging') && 
                   (child.classList.contains('separador') || 
                    child.classList.contains('evento-with-variables') || 
                    child.classList.contains('variable-wrapper'));
        });

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Export functionality
    exportBtn.addEventListener('click', () => {
        // Force save current state
        saveToLocalStorage();
        
        const eventosData = localStorage.getItem('eventosData');
        if (eventosData) {
            try {
                // Validate JSON before export
                JSON.parse(eventosData);
                
                const blob = new Blob([eventosData], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const date = new Date().toISOString().split('T')[0];
                a.download = `eventos_data_${date}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error exporting data:', error);
                alert('Error al exportar datos');
            }
        } else {
            alert('No hay datos para exportar');
        }
    });

    // Import functionality
    importBtn.addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    // Clear existing data
                    separadorContainer.innerHTML = '';
                    localStorage.removeItem('eventosData');
                    
                    // Import each separador sequentially
                    for (const separadorData of importedData) {
                        await createSeparador(separadorData);
                    }
                    
                    saveToLocalStorage();
                } catch (error) {
                    console.error('Error importing data:', error);
                    alert('Error al importar datos: Formato inválido');
                }
                // Reset input
                e.target.value = '';
            };
            reader.readAsText(file);
        }
    });

    // Initial setup - explicitly bind the event listener
    if (addSeparadorBtn) {
        addSeparadorBtn.addEventListener('click', async () => {
            const separador = await createSeparador();
            if (separador) {
                saveToLocalStorage();
            }
        });
    } else {
        console.error('Add separador button not found');
    }

    function setupEventListeners() {
        // Add to drag end events
        document.addEventListener('dragend', () => {
            saveToLocalStorage();
        });

        // Add to all edit operations
        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('editable') || 
                e.target.closest('.separador') || 
                e.target.closest('.evento') || 
                e.target.closest('.variable')) {
                saveToLocalStorage();
            }
        }, true);
    }

    function setupAdditionalSaveTriggers() {
        // Save on any content changes
        const observer = new MutationObserver(() => {
            saveToLocalStorage();
        });

        observer.observe(separadorContainer, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });

        // Save on any drag operations
        document.addEventListener('dragend', saveToLocalStorage);

        // Save on any input events
        document.addEventListener('input', (e) => {
            if (e.target.closest('#separador-container')) {
                saveToLocalStorage();
            }
        });
    }

    setupEventListeners();
    setupAdditionalSaveTriggers();

    // Load existing data
    loadFromLocalStorage();
});