import * as Adaptive from "adaptivecards";
import * as Controls from "adaptivecards-controls";
import * as Constants from "./constants";
import * as Designer from "./card-designer";
import { HostContainer } from "./containers/host-container";
import { OutlookContainer } from "./containers/outlook-container";
import { CortanaContainer } from "./containers/cortana-container";
import { SkypeContainer } from "./containers/skype-container";
import { adaptiveCardSchema } from "./adaptive-card-schema";

declare var monacoEditor: any;
declare function loadMonacoEditor(schema, callback);

var isMonacoEditorLoaded: boolean = false;

function monacoEditorLoaded() {
    document.getElementById("loadingEditor").remove();

    monacoEditor.onDidChangeModelContent(
        function (e) {
            scheduleCardRefresh();
        });

    isMonacoEditorLoaded = true;

    updateJsonFromCard();
}

var jsonUpdateTimer: NodeJS.Timer;
var cardUpdateTimer: NodeJS.Timer;
var updateLayoutTimer: NodeJS.Timer;

var preventCardUpdate: boolean = false;

function updateJsonFromCard() {
    try {
        preventCardUpdate = true;

        if (!preventJsonUpdate && isMonacoEditorLoaded) {
            monacoEditor.setValue(JSON.stringify(app.card.toJSON(), null, 4));
            app.buildTreeViewSheet(app.designer.selectedPeer);
        }
    }
    finally {
        preventCardUpdate = false;
    }
}

function scheduleJsonUpdate() {
    clearTimeout(jsonUpdateTimer);

    if (!preventJsonUpdate) {
        jsonUpdateTimer = setTimeout(updateJsonFromCard, 100);
    }
}

var preventJsonUpdate: boolean = false;

function updateCardFromJson() {
    try {
        preventJsonUpdate = true;

        if (!preventCardUpdate && isMonacoEditorLoaded) {
            app.card.parse(JSON.parse(monacoEditor.getValue()));
            app.designer.render();
        }
    }
    finally {
        preventJsonUpdate = false;
    }
}

function scheduleCardRefresh() {
    clearTimeout(cardUpdateTimer);

    if (!preventCardUpdate) {
        cardUpdateTimer = setTimeout(updateCardFromJson, 200);
    }
}

function updateDesignerLayout() {
    app.designer.updateLayout(false);
}

function scheduleLayoutUpdate() {
    clearTimeout(updateLayoutTimer);

    updateLayoutTimer = setTimeout(updateDesignerLayout, 50);
}

// Monaco loads asynchronously via a call to require() from index.html
// App initialization needs to happen after.
declare function loadMonacoEditor(schema: any, callback: () => void);

class PaletteItem extends Designer.DraggableElement {
    protected internalRender(): HTMLElement {
        var element = document.createElement("div");
        element.classList.add("acd-palette-item");
        element.innerText = this.typeRegistration.typeName;

        return element;
    }

    readonly typeRegistration: Adaptive.ITypeRegistration<Adaptive.CardElement>;

    constructor(typeRegistration: Adaptive.ITypeRegistration<Adaptive.CardElement>) {
        super();

        this.typeRegistration = typeRegistration;
    }

    cloneElement(): HTMLElement {
        return this.internalRender();
    }

    createPeer(): Designer.CardElementPeer {
        var peer = Designer.CardDesigner.cardElementPeerRegistry.createPeerInstance(null, this.typeRegistration.createInstance());
        peer.initializeCardElement();

        return peer;
    }
}

class DesignerApp {
    private _designer: Designer.CardDesigner;
    private _designerHostElement: HTMLElement;
    private _paletteHostElement: HTMLElement;
    private _draggedPaletteItem: PaletteItem;
    private _draggedElement: HTMLElement;
    private _currentMousePosition: Designer.IPoint;
    private _card: Adaptive.AdaptiveCard;
    private _hostContainerPicker: Controls.DropDown;
    private _selectedHostContainer: HostContainer;
    private _treeViewFoldedElements: Array<string>;

    public buildTreeViewSheet(peer: Designer.DesignerPeer) {
        if (this.treeViewSheetHostElement) {
            let treeview = this.treeViewSheetHostElement.getElementsByClassName("treeview")[0];
            treeview.innerHTML = "";

            const items = [...this._card.getItems(), ...this._card.getActions()];
            const listItems = this.generateTreeViewElements(items, peer);
            treeview.appendChild(listItems);
        }
    }

    private generateTreeViewElements(cardItems: Array<Adaptive.CardElement | Adaptive.Action>, peer: Designer.DesignerPeer, identationLevel: number = 0): HTMLElement {
        if (!cardItems || cardItems.length === 0) {
            let node = document.createElement("ul");
            return node;
        }

        let selected_id: string;
        if  (peer instanceof Designer.ActionPeer) {
            selected_id = peer ? peer.action.elementId : "";
        } else if(peer instanceof Designer.CardElementPeer) {
            selected_id = peer ? peer.cardElement.elementId : "";
        }

        let itemList = document.createElement("ul");
        itemList.className = "treeview__container";

        let itemIndex = 0;
        while(itemIndex < cardItems.length) {
            let item = cardItems[itemIndex];
            const listItem = this.createTreeViewListItem(item, selected_id, identationLevel);
            itemList.appendChild(listItem);

            const isFolded = this._treeViewFoldedElements.indexOf(item.elementId) !== -1;

            let childs = [];
            if ([Adaptive.Container.name, Adaptive.Column.name].indexOf(item.getJsonTypeName()) !== -1) {
                childs = (item as Adaptive.Container).getItems();
            } else if (item.getJsonTypeName() === Adaptive.ColumnSet.name) {
                childs = (item as Adaptive.ColumnSet).getColumns();
            }

            if (childs.length) {
                itemList.appendChild(this.createChildList(childs, peer, identationLevel, isFolded));
            } else {
                let emptyChild = document.createElement("li");
                emptyChild.className = "treeview__element is-empty";
                itemList.appendChild(emptyChild)
            }

            itemIndex++;
        }
        return itemList;
    }

    private createChildList(items, peer, identationLevel, isFolded): HTMLElement {
        const newItem = document.createElement("li");
        newItem.className = "treeview__element";
        if (isFolded) {
            newItem.className += " is-folded";
        }

        newItem.appendChild(this.generateTreeViewElements(items, peer, ++identationLevel));
        return newItem;
    }

    private createTreeViewListItem (item: Adaptive.CardElement | Adaptive.Action, selected_id: string, identationLevel: number): HTMLElement {
        let listItem = document.createElement("li");
        listItem.className = "treeview__element";
        if (selected_id && item.elementId === selected_id) {
            listItem.className += " is-selected";
        }

        if ([Adaptive.Container.name, Adaptive.Column.name, Adaptive.ColumnSet.name].indexOf(item.getJsonTypeName()) !== -1) {
            let foldArrow = document.createElement("button");
            foldArrow.className = `btn treeview__icon treeview__icon--arrow`;
            if (this._treeViewFoldedElements.indexOf(item.elementId) !== -1) {
                foldArrow.classList.toggle("is-rotated");
            }
            foldArrow.addEventListener("click", () => {
                this.foldTreeViewContainer(item.elementId, foldArrow);
                foldArrow.classList.toggle("is-rotated");
            });
            listItem.appendChild(foldArrow);
        }

        let icon = document.createElement("span");
        icon.className = `treeview__icon treeview__icon--${this.sanitizeString(item.getJsonTypeName())}`;
        listItem.appendChild(icon);

        let title = document.createElement("span");
        title.className = `treeview__title`;
        title.textContent = item.getJsonTypeName();
        listItem.appendChild(title);

        listItem.addEventListener("click", () => {
            this._designer.setSelectedPeerById(item.elementId);
        });
        listItem.style.paddingLeft = `${identationLevel * 46 + 24}px`;
        return listItem;
    }

    private foldTreeViewContainer(elementId: string, listElement: HTMLElement) {
        const parent = listElement.parentElement;
        const childList = parent.nextElementSibling as HTMLElement;
        let addClassResult = childList.classList.toggle("is-folded")

        if (addClassResult) {
            this._treeViewFoldedElements.push(elementId);
        } else {
            let index = this._treeViewFoldedElements.indexOf(elementId);
            this._treeViewFoldedElements.splice(index, 1);
        }
    }

    private sanitizeString(input: string): string {
        return input.toLowerCase().replace(".", "");
    }

    private buildPropertySheet(peer: Designer.DesignerPeer) {
        if (this.propertySheetHostElement) {
            this.propertySheetHostElement.innerHTML = "";

            let card: Adaptive.AdaptiveCard;

            if (peer) {
                card = peer.buildPropertySheetCard();
            }
            else {

                card = new Adaptive.AdaptiveCard();
                card.parse(
                    {
                        type: "AdaptiveCard",
                        version: "1.0",
                        body: [
                            {
                                type: "TextBlock",
                                wrap: true,
                                size: "medium",
                                text: "**Nothing is selected**"
                            },
                            {
                                type: "TextBlock",
                                wrap: true,
                                text: "Select an element in the card to modify its properties."
                            }
                        ]
                    }
                );
            }

            this.propertySheetHostElement.appendChild(card.render());
        }
    }

    private buildPalette() {
        if (this.paletteHostElement) {
            this.paletteHostElement.innerHTML = "";

            var sortedRegisteredTypes: Array<Adaptive.ITypeRegistration<Adaptive.CardElement>> = [];

            for (var i = 0; i < Adaptive.AdaptiveCard.elementTypeRegistry.getItemCount(); i++) {
                sortedRegisteredTypes.push(Adaptive.AdaptiveCard.elementTypeRegistry.getItemAt(i));
            }

            sortedRegisteredTypes.sort(
                (a, b) => {
                    if (a.typeName < b.typeName) {
                        return -1
                    }
                    else {
                        return 1;
                    }
                }
            )

            for (var i = 0; i < sortedRegisteredTypes.length; i++) {
                var paletteItem = new PaletteItem(sortedRegisteredTypes[i]);
                paletteItem.render();
                paletteItem.onStartDrag = (sender: PaletteItem) => {
                    this._draggedPaletteItem = sender;

                    this._draggedElement = sender.cloneElement();
                    this._draggedElement.style.position = "absolute";
                    this._draggedElement.style.left = this._currentMousePosition.x + "px";
                    this._draggedElement.style.top = this._currentMousePosition.y + "px";

                    document.body.appendChild(this._draggedElement);
                }

                this.paletteHostElement.appendChild(paletteItem.renderedElement);
            }
        }
    }

    private endDrag() {
        if (this._draggedPaletteItem) {
            this._draggedPaletteItem.endDrag();
            this._draggedElement.remove();

            this._draggedPaletteItem = null;
            this._draggedElement = null;
        }
    }

    private addContainers() {
        this.hostContainers.push(new OutlookContainer("Outlook Actionable Messages", "css/outlook-container.css"));
        this.hostContainers.push(new CortanaContainer("Cortana Skills", "css/cortana-container.css"));
        this.hostContainers.push(new SkypeContainer("Skype (Preview)", "css/skype-container.css"));
    }

    private recreateDesigner() {
        var styleSheetLinkElement = <HTMLLinkElement>document.getElementById("adaptiveCardStylesheet");

        if (styleSheetLinkElement == null) {
            styleSheetLinkElement = document.createElement("link");
            styleSheetLinkElement.id = "adaptiveCardStylesheet";

            document.getElementsByTagName("head")[0].appendChild(styleSheetLinkElement);
        }

        styleSheetLinkElement.rel = "stylesheet";
        styleSheetLinkElement.type = "text/css";
        styleSheetLinkElement.href = this._selectedHostContainer.styleSheet;

        this._selectedHostContainer.initialize();

        this._designerHostElement.innerHTML = "";
        this._selectedHostContainer.renderTo(this._designerHostElement);

        this._designer = new Designer.CardDesigner(this._selectedHostContainer.cardHost);
        this._designer.onSelectedPeerChanged = (peer: Designer.CardElementPeer) => {
            this.buildPropertySheet(peer);
            this.buildTreeViewSheet(peer);
        };
        this._designer.onLayoutUpdated = (isFullRefresh: boolean) => {
            if (isFullRefresh) {
                scheduleJsonUpdate();
            }
        };

        this.buildPalette();
        this.buildPropertySheet(null);
        this.buildTreeViewSheet(null);

        if (this._card) {
            this._card.hostConfig = this._selectedHostContainer.getHostConfig();
        }

        this._designer.card = this._card;
    }

    private selectedHostContainerChanged() {
        this.recreateDesigner();
    }

    readonly hostContainers: Array<HostContainer> = [];

    propertySheetHostElement: HTMLElement;
    treeViewSheetHostElement: HTMLElement;
    commandListHostElement: HTMLElement;

    constructor(designerHostElement: HTMLElement) {
        this._treeViewFoldedElements = [];
        this._designerHostElement = designerHostElement;

        this.addContainers();

        this._selectedHostContainer = this.hostContainers[0];

        this.recreateDesigner();
    }

    createContainerPicker(): Controls.DropDown {
        this._hostContainerPicker = new Controls.DropDown();

        for (var i = 0; i < this.hostContainers.length; i++) {
            let item = new Controls.DropDownItem(i.toString(), this.hostContainers[i].name);

            this._hostContainerPicker.items.add(item);
        }

        this._hostContainerPicker.selectedIndex = 0;
        this._hostContainerPicker.onValueChanged = (sender: Controls.InputControl) => {
            this._selectedHostContainer = this.hostContainers[Number.parseInt(this._hostContainerPicker.value.key)];

            this.selectedHostContainerChanged();
        }

        return this._hostContainerPicker;
    }

    newCard() {
        let card = {
            type: "AdaptiveCard",
            version: "1.0",
            body: [
            ]
        }

        monacoEditor.setValue(JSON.stringify(card, null, 4));
    }

    handlePointerMove(e: PointerEvent) {
        this._currentMousePosition = { x: e.x, y: e.y };

        let isPointerOverDesigner = this.designer.isPointerOver(this._currentMousePosition.x, this._currentMousePosition.y);
        let peerDropped = false;

        if (this._draggedPaletteItem && isPointerOverDesigner) {
            let peer = this._draggedPaletteItem.createPeer();

            let clientCoordinates = this.designer.pageToClientCoordinates(this._currentMousePosition.x, this._currentMousePosition.y);

            if (this.designer.tryDrop(clientCoordinates, peer)) {
                this.endDrag();

                this.designer.startDrag(peer);

                peerDropped = true;
            }
        }

        if (!peerDropped && this._draggedElement) {
            this._draggedElement.style.left = this._currentMousePosition.x - 10 + "px";
            this._draggedElement.style.top = this._currentMousePosition.y - 10 + "px";
        }
    }

    handlePointerUp(e: PointerEvent) {
        this.endDrag();
        this.designer.endDrag();
    }

    get paletteHostElement(): HTMLElement {
        return this._paletteHostElement;
    }

    set paletteHostElement(value: HTMLElement) {
        if (this._paletteHostElement != value) {
            this._paletteHostElement = value;
        }
    }

    get card(): Adaptive.AdaptiveCard {
        return this._card;
    }

    set card(value: Adaptive.AdaptiveCard) {
        if (this._card != value) {
            if (this._card) {
                this._card.designMode = false;
            }

            this._card = value;

            if (this._card) {
                this._card.designMode = true;
                this._card.hostConfig = this._selectedHostContainer.getHostConfig();
            }

            this.recreateDesigner();
        }
    }

    get designer(): Designer.CardDesigner {
        return this._designer;
    }
}

class Splitter {
    private _splitterElement: HTMLElement;
    private _sizedELement: HTMLElement;
    private _isPointerDown: boolean;
    private _lastClickedOffset: Designer.IPoint;

    private pointerDown(e: PointerEvent) {
        e.preventDefault();

        this._splitterElement.setPointerCapture(e.pointerId);

        this._lastClickedOffset = { x: e.x, y: e.y };

        this._isPointerDown = true;
    }

    private pointerMove(e: PointerEvent) {
        if (this._isPointerDown) {
            e.preventDefault();

            if (this.isVertical) {
                this._sizedELement.style.width = (this._sizedELement.getBoundingClientRect().width - (e.x - this._lastClickedOffset.x)) + "px";
            }
            else {
                this._sizedELement.style.height = (this._sizedELement.getBoundingClientRect().height - (e.y - this._lastClickedOffset.y)) + "px";
            }

            if (this.onRezized) {
                this.onRezized(this);
            }

            this._lastClickedOffset = { x: e.x, y: e.y };
        }
    }

    private pointerUp(e: PointerEvent) {
        e.preventDefault();

        this._splitterElement.releasePointerCapture(e.pointerId);

        this._isPointerDown = false;
    }

    onRezized: (sender: Splitter) => void;

    isVertical: boolean = false;

    constructor(splitterElement: HTMLElement, sizedElement: HTMLElement) {
        this._splitterElement = splitterElement;
        this._sizedELement = sizedElement;

        this._splitterElement.onmousedown = (e: MouseEvent) => {e.preventDefault(); };
        this._splitterElement.onpointerdown = (e: PointerEvent) => { this.pointerDown(e); };
        this._splitterElement.onpointermove = (e: PointerEvent) => { this.pointerMove(e); };
        this._splitterElement.onpointerup = (e: PointerEvent) => { this.pointerUp(e); };
    }
}

var app: DesignerApp;
var horizontalSplitter: Splitter;
var propertyVerticalSplitter: Splitter;
var treeViewVerticalSplitter: Splitter;

window.onload = () => {
    document.getElementById("btnNewCard").onclick = (e) => {
        app.newCard();
    }

    horizontalSplitter = new Splitter(document.getElementById("horizontalSplitter"), document.getElementById("jsonEditorHost"));
    horizontalSplitter.onRezized = (splitter: Splitter) => {
        if (isMonacoEditorLoaded) {
            monacoEditor.layout();
        }
    }

    propertyVerticalSplitter
        = new Splitter(document.getElementById("propertyVerticalSplitter"), document.getElementById("propertySheetHost"));
    propertyVerticalSplitter.isVertical = true;
    propertyVerticalSplitter.onRezized = (splitter: Splitter) => {
        scheduleLayoutUpdate();
    }

    treeViewVerticalSplitter
        = new Splitter(document.getElementById("treeViewVerticalSplitter"), document.getElementById("treeViewSheetHost"));
    treeViewVerticalSplitter.isVertical = true;

    let card = new Adaptive.AdaptiveCard();
    card.onImageLoaded = (image: Adaptive.Image) => {
        scheduleLayoutUpdate();
    }
    card.parse(JSON.parse(Constants.defaultPayload));

    app = new DesignerApp(document.getElementById("designerHost"));
    app.propertySheetHostElement = document.getElementById("propertySheetHost");
    app.treeViewSheetHostElement = document.getElementById("treeViewSheetHost");
    app.commandListHostElement = document.getElementById("commandsHost");
    app.paletteHostElement = document.getElementById("toolPalette");

    app.createContainerPicker().attach(document.getElementById("containerPickerHost"));

    window.addEventListener("pointermove", (e: PointerEvent) => { app.handlePointerMove(e); });
    window.addEventListener("resize", () => { scheduleLayoutUpdate(); });
    window.addEventListener("pointerup", (e: PointerEvent) => { app.handlePointerUp(e); });

    app.card = card;

    loadMonacoEditor(adaptiveCardSchema, monacoEditorLoaded);
};
