chrome.runtime.onMessage.addListener(function(message, _, sendResponse) {
    console.log(message.action);
    if(message.action == 'init')
        sendResponse({model: buildDOMReferenceObject()});
    else if(message.action == 'update')
        sendResponse({success: true});
    else if(message.action == 'restore')
        sendResponse({success: restoreWebPage(message.uuids)});

    return true;
});

//Build DOM Model Object, inject UUID references
//NEED TO SKIP ELEMENT AND CHILDREN IF DISPLAY: NONE
//FIX AFTER F9 MERGES
function buildDOMReferenceObject() {
    var DOMTreeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL, { acceptNode: nodeFilter }, false);
    var DOMModelObject = {};

    var end = false;
    var groupIndex = 0;
    var mostRecentBlockLevel = 0;
    while(!end) {
        var node = DOMTreeWalker.nextNode();
        var textGroup = {group: []};

        if(!node)
            end = true;

        while(node) {
            if(isElementNode(node)) {
                if(isInlineLevelElement(node) && getNodeTreeDepth(node) <= mostRecentBlockLevel)
                    break;
                else {
                    mostRecentBlockLevel = getNodeTreeDepth(node);
                    break;
                }
            }
            else if(isTextNode(node) && !isNodeTextValueWhitespaceOnly(node)) {
                var identifierUUID = generateElementUUID();
                var nodeText = node.nodeValue;
                var textNodeInformation = {groupIndex: groupIndex, text: nodeText, elementUUID: identifierUUID};

                textGroup.group.push(textNodeInformation);
                $(node.parentElement).addClass(identifierUUID);
            }

            node = DOMTreeWalker.nextNode();
            if(!node)
                end = true;
        }

        if(textGroup.group.length == 0)
            continue;

        DOMModelObject[groupIndex++] = textGroup;
    }

    return DOMModelObject; //Needs to be JSON compatible (Message API only supports JSON)
}

//TreeWalker Filter, Allowing Element and Text Nodes
function nodeFilter(node) {
    if(isElementNode(node)) {
        if(node.tagName.toLowerCase() == 'script')
            return NodeFilter.FILTER_REJECT;
        else
            return NodeFilter.FILTER_ACCEPT;
    }
    else if(isTextNode(node)) {
        if(isNodeTextValueWhitespaceOnly(node))
            return NodeFilter.FILTER_REJECT;
        else
            return NodeFilter.FILTER_ACCEPT;
    }

    return NodeFilter.FILTER_REJECT;
}

//Check if Node is Element Node
function isElementNode(node) {
    return node.nodeType == 1;
}

//Check if Node is Text Node
function isTextNode(node) {
    return node.nodeType == 3;
}

//Check if Element is Inline
function isInlineLevelElement(element) {
    if(!isElementNode(element))
        return false;

    var elementTagName = element.tagName.toLowerCase();
    var inlineElements = ['a','b','big','i','small','tt','abbr','acronym',
        'cite','code','dfn','em','kbd','strong','samp','time','var','bdo',
        'br','img','map','object','q','script','span','sub','sup','button',
        'input','label','select','textarea'];

    for(var index = 0; index < inlineElements.length; index++)
        if(elementTagName == inlineElements[index])
            return true;

    return false;
}

//Check if a Text Node Value Contains only Whitespace
function isNodeTextValueWhitespaceOnly(node) {
    return !(/[^\t\n\r ]/.test(node.nodeValue));
}

//Check if a Node Text Content Contains only Whitespace
function isNodeContentValueWhitespaceOnly(node) {
    return !(/[^\t\n\r ]/.test(node.textContent));
}

//Get Depth of Node in Tree
function getNodeTreeDepth(node) {
    var depth = -1;

    while(node != null) {
        depth++;
        node = node.parentNode;
    }

    return depth;
}

//Generate V4 UUID
function generateElementUUID() {
    function generateBlock(size) {
        var block = '';
        for(var index = 0; index < size; index++)
            block += Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);

        return block;
    }

    var uuid = '';
    var blockSizes = [2,1,1,1,3];
    for(var index = 0; index < blockSizes.length; index++)
        uuid += generateBlock(blockSizes[index]) + (index == blockSizes.length-1 ? '' : '-');

    return uuid;
}

//Remove All Highlighting and Injected Markup
function restoreWebPage(uuids) {
    //remove highlighting within uuid classes
    //TODO

    //remove element uuid classes
    for(var index = 0; index < uuids.length; index++) {
        var elementClassUUID = '.' + uuids[index];
        $(elementClassUUID).removeClass(uuids[index]);
    }

    return true;
}