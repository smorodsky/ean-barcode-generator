// EAN Barcode Generator
// An InDesign JavaScript
// Make EAN-8, EAN-13, EAN-13+2, EAN-13+5 barcodes

/*
License: MIT

Copyright (C) 2013 Konstantin Smorodsky

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to 
deal in the Software without restriction, including without limitation the 
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
sell copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in 
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS 
IN THE SOFTWARE.
*/

// 2013-04-12

#script 'EAN_Barcode_Generator.jsx'
#target 'indesign'
#targetengine 'session'

// удаляет пробельные символы в начале и в конце строки
String.prototype.trim = function()
{
    var whitespace = ' \n\r\t\f\x0b\xa0\u2000\u2001\u2002\u2003\
\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000';
    
    var str = this;
    
    for (var i = 0, l = str.length; i < l; i++) 
    {
        if (whitespace.indexOf(str.charAt(i)) === -1) 
        {
            str = str.substring(i);
            break;
        }
    }
    
    for (i = str.length - 1; i >= 0; i--) 
    {
        if (whitespace.indexOf(str.charAt(i)) === -1) 
        {
            str = str.substring(0, i + 1);
            break;
        }
    }
    
    return whitespace.indexOf(str.charAt(0)) === -1 ? str : '';
}

;(function() {

    var scriptName = 'EAN Barcode Generator';
    
    if (Number(String(app.version).split('.')[0]) < 6) {
        alert(scriptName + '\n' +
            'This script only for Adobe InDesign CS4 and late.')
        return;
    }

    // read preferences
    var prefs = {
        script:          scriptName,
        code1:           '123456789012',
        fonts:           ['OCR-B', 'Arial', 'Helvetica', 'Myriad Pro'],
        fontName:        'OCR-B',
        fontSize:        '11',
        whiteBackground: true,
        rightMark:       true,
        outlines:        true
    }
    var prefsFile = new File(Folder.userData.absoluteURI + '/EAN_Barcode_Generator.prefs');

    if (prefsFile.exists && prefsFile.open('r')) {
        try {
            var newPrefs = eval(prefsFile.read());
            
            for (var i in newPrefs) {
                if (i in prefs) prefs[i] = newPrefs[i];
            }
            
        } catch (e) {}
        prefsFile.close();
    }
    var FilterFonts = function (arr) {
        
        var filteredFonts = [];
        var allFonts = '\n' + app.fonts.everyItem().fontFamily.join('\n') + '\n';
        
        for (var i = 0, l = arr.length; i < l; i++) {
            if (allFonts.indexOf('\n' + arr[i] + '\n') < 0) continue;
            filteredFonts.push(arr[i]);
        }
        if (filteredFonts.length == 0) {
            filteredFonts = app.fonts.everyItem().fontFamily;
        }
        return filteredFonts;
    }

    var dialog = new Window ("dialog", scriptName);
    dialog.orientation = "row";
    dialog.alignChildren = "top";
    
    var mainGroup = dialog.add ("panel");
    mainGroup.alignChildren = "left";
    mainGroup.orientation = "column";
    var tipFont = ScriptUI.newFont("dialog", undefined, 11);
    var tip = 'This script to makes barcodes:\n' + 
        'EAN-8, EAN-8+2, EAN-8+5, EAN-13, EAN-13+2, EAN-13+5.\n' +
        'Type appropriate number of digits, and if need use any letters or spaces as separator.\n' + 
        'For example: 12345678-12345'
    var tipSt = mainGroup.add ("statictext", undefined, tip, {multiline: true});
    tipSt.graphics.font = tipFont;
    tipSt.minimumSize = {width: 250, height: 20};
    mainGroup.add ("statictext", undefined, 'Type digit values of barcodes:');
    
    // barcodes list
    var bcList = mainGroup.add (
        "EditText", 
        undefined, 
        decodeURI(prefs.code1), 
        {multiline: true, wantReturn:true});
    bcList.minimumSize = {width: 250, height: 200};
    bcList.maximumSize = {width: 250, height: 400};
    bcList.onChanging = function(){
        okButton.enabled = bcList.text.length;
    };
    
    // font
    var fontGroup = mainGroup.add ("group");
    fontGroup.add ("statictext", undefined, "Font:");
    
    var fontsList = fontGroup.add (
        "dropdownlist", 
        undefined, 
        FilterFonts(prefs.fonts), 
        {multiselect: false});
    
    var item = fontsList.find(prefs.fontName);
    fontsList.selection = item ? item : 0;
    
    var fontSize = fontGroup.add (
        "EditText", 
        undefined, 
        prefs.fontSize);
    fontSize.minimumSize = {width: 40, height: 1};
    fontGroup.add ("statictext", undefined, "pt");
    
    // checkboxes
    var whiteBG = mainGroup.add ("checkbox", undefined, 'White Backgroud');
    whiteBG.value = prefs.whiteBackground;
    var addGT = mainGroup.add ("checkbox", undefined, 'Quiet Zone Indicator (>)');
    addGT.value = prefs.rightMark;
    var createOutlines = mainGroup.add ("checkbox", undefined, 'Create Text Outlines');
    createOutlines.value = prefs.outlines;
    
    
    // основные кнопки
    var buttonGroup = dialog.add ("group");
    buttonGroup.alignChildren = "fill";
    buttonGroup.orientation = "column";
    
    var barCodes = [];
    
    var okButton = buttonGroup.add ("button", undefined, "OK", {name: "ok"});
    okButton.onClick = function() {
        // check
        if (isNaN(parseFloat(fontSize.text))) {
            alert('Invalid Value of Font Size.');
            fontSize.active = true;
            return;
        }
    
        var rawBc = bcList.text.trim();
                
        try {
            rawBc = rawBc.split(/[\n\r]+/);
            
            for (var i = 0, ii = rawBc.length; i < ii; i++){
                var barCode = rawBc[i].trim();
                
                if (!barCode.length) continue;
                
                var rc = [], accumulator = '';
                
                for (var j = 0, jj = barCode.length; j < jj; j++) {
                    var chr = barCode[j];
                    
                    if (chr >= '0' && chr <= 9) {
                        accumulator += chr;
                        continue;
                    }
                    if (chr == 'x' || chr == 'X') {
                        if (j != 12 || rc.length != 0) throw 'X';
                        accumulator += 'X';
                        continue;
                    }
                    if (accumulator) {
                        rc.push(accumulator);
                        accumulator = '';
                    }
                }
                rc.push(accumulator);
                
                if (rc.length > 2) throw 0;
                if (rc[0].length != 8 && rc[0].length != 12 && rc[0].length != 13) throw 0;
                if (rc.length == 2 && rc[1].length != 2 && rc[1].length != 5) throw 0;
                
                barCodes.push(rc);
            }
        } 
        catch (e) {
            alert('Invalid barcode value: "' + barCode + 
                '"\nPlease type barcode value in format: 12345678 or 12345678-12');
            bcList.active = true;
            return;
        }
        if (barCodes.length < 1) {
            alert('Input barcode value. Please type 8 or 12 digits.');
            return;
        }
        if (Math.abs(fontSize.text) > 12 && !confirm(
            'The font size is too large. Labels may be displayed incorrectly. Continue?')) {
            return;
        }
        dialog.close(1);
    }
    buttonGroup.add ("button", undefined, "Cancel", {name: "cancel"});
    
    bcList.active = true;
    if (1 != dialog.show()) exit();
    
    // save prefs
    prefs.code1 =           encodeURI(bcList.text);
    prefs.fontName =        fontsList.selection.text || prefs.fontName;
    prefs.fontSize =        Math.abs(fontSize.text || '11');
    prefs.whiteBackground = whiteBG.value;
    prefs.rightMark =       addGT.value;
    prefs.outlines =        createOutlines.value;
    
    prefsFile.open('w') && prefsFile.write(prefs.toSource());
    prefsFile.close();
    
    // make progressbar
    if (barCodes.length > 1) {
        var pBar = new Window ("palette", scriptName);
        pBar.progress = pBar.add('progressbar', 
            {x:10, y:12, width:350, height:12}, 0, barCodes.length); 
        pBar.show();
    } else {
        var pBar = null;
    }
    // do barcodes
    var doc = app.documents.add(), page = doc.pages[0];
    doc.documentPreferences.facingPages = false;
    page.appliedMaster = NothingEnum.NOTHING;
    page.marginPreferences.top    = 0;
    page.marginPreferences.right  = 0;
    page.marginPreferences.bottom = 0;
    page.marginPreferences.left   = 0;
    doc.marginPreferences.top    = 0;
    doc.marginPreferences.right  = 0;
    doc.marginPreferences.bottom = 0;
    doc.marginPreferences.left   = 0;
    doc.documentPreferences.pageWidth = '100mm';
    doc.documentPreferences.pageHeight = '100mm'; 
    doc.documentPreferences.pagesPerDocument = barCodes.length;
    doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.POINTS;
    doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.POINTS;
    doc.zeroPoint = [0, 0];
    
    for (var i = 0, l = barCodes.length; i < l; i++) {
        
        pBar && pBar.progress.value = i + 1;
        
        var barCode = barCodes[i];
        var page = doc.pages[i];
        
        var grp = new BarCode(
            page, 
            barCode[0].substr(0, 12), 
            barCode[1], 
            prefs.rightMark, 
            prefs.outlines,
            prefs.fontName,
            prefs.fontSize);
        
        var bg = grp.allPageItems[grp.allPageItems.length - 1];
        
        if (Number(app.version.split('.')[0]) >= 8) {
            page.resize(
                CoordinateSpaces.INNER_COORDINATES,
                AnchorPoint.TOP_LEFT_ANCHOR,
                ResizeMethods.REPLACING_CURRENT_DIMENSIONS_WITH,
                [bg.geometricBounds[3] - bg.geometricBounds[1], 
                bg.geometricBounds[2] - bg.geometricBounds[0]] // x, y
                );
       }
       if (!prefs.whiteBackground) {
           bg.remove();
       }
    }
    pBar && pBar.close();
})();

// **************************************************************************

function BarCode(page, code, ext, addGT, createOutlines, fontName, fontSize) {
    var lineWidth = 0.33; // mm
    var lineHeight = 22.85;
    var separatorHeight = 24.5;
    var topSpace = 3;
    var leftSpace = 4;
    var rightSpace = 4;
    var charPaddingTop = 0.33;
    ext = ext || '';
    fontSize = fontSize || 11; // pt
    fontName = fontName || 'Arial';
    var doc = page.parent.parent;
    
    // see http://en.wikipedia.org/wiki/European_Article_Number
    var ean13_array = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 
                       'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
    // see http://en.wikipedia.org/wiki/EAN_2
    var ean13_2_array = ['LL', 'LG', 'GL', 'GG'];
    // see http://en.wikipedia.org/wiki/EAN_5
    var ean13_5_array = ['GGLLL', 'GLGLL', 'GLLGL', 'GLLLG', 'LGGLL', 
                         'LLGGL', 'LLLGG', 'LGLGL', 'LGLLG', 'LLGLG'];
    var ean13_digits = [
    //    L-code only 
        [3, 2, 1, 1],    // 0    ...||.|
        [2, 2, 2, 1],    // 1    ..||..|
        [2, 1, 2, 2],    // 2    ..|..||
        [1, 4, 1, 1],    // 3    .||||.|
        [1, 1, 3, 2],    // 4    .|...||
        [1, 2, 3, 1],    // 5    .||...|
        [1, 1, 1, 4],    // 6    .|.||||
        [1, 3, 1, 2],    // 7    .|||.||
        [1, 2, 1, 3],    // 8    .||.|||
        [3, 1, 1, 2]     // 9    ...|.||
    ];
    
    var separators = {
        ean13_start: {start:1, lines:[1, 1, 1]},     //     |.|
        ean13: {start:0, lines:[1, 1, 1, 1, 1]},     //     .|.|.
        ean5_start: {start:0, lines:[1, 1, 1, 2]},   //     .|.||
        ean5: {start:0, lines:[1, 1]}                //     .|
    }
    
    var pageItems = [];
    
    if((code + ext).search('^[0-9]+'))
        return null;
    
    var getCode = function(value, key) {
        var lines = ean13_digits[parseInt(value)];
        // L: 3211, G: 1123, R: 3211
        var start = key != 'R' ? 0 : 1;
        if (key == 'G')
            // duplicate & reverse
            lines = lines.slice(0).reverse();
        return {start: key != 'R' ? 0 : 1, lines: lines};
    }
    
    var writeLine = function(pos, width, len) {
        var rect = page.rectangles.add();
        rect.applyObjectStyle(doc.objectStyles.item(0));
        rect.strokeWeight = 0;
        rect.strokeColor = "None";
        rect.fillColor = "Black";
        rect.fillTint = -1;
        rect.geometricBounds = [ //top, left, bottom, right
            topSpace + 'mm', 
            pos + 'mm', 
            (topSpace + len) + 'mm', 
            (pos + lineWidth * width) + 'mm'
        ];
        pageItems.push(rect);
    }
    
    var writeChar = function(left, chr) {
        if (!chr) 
            return [];
        var top = topSpace + lineHeight + charPaddingTop;
        var tf = page.textFrames.add();
        tf.strokeColor = "None";
        tf.fillColor = "None";
        tf.fillTint = -1;
        tf.geometricBounds = [
            top + 'mm', 
            left - 0.5 + 'mm', 
            top + fontSize / 3 + 'mm', 
            left + 7 * lineWidth + 0.5 + 'mm'
        ];
        tf.textFramePreferences.firstBaselineOffset = FirstBaseline.ASCENT_OFFSET;
        tf.textFramePreferences.ignoreWrap = true;
        tf.textFramePreferences.insetSpacing = [0,0,0,0];
        tf.textFramePreferences.textColumnCount = 1;
        tf.textFramePreferences.verticalJustification = VerticalJustification.TOP_ALIGN;
        tf.contents = chr;
        var par = tf.paragraphs.item(-1);
        par.justification = Justification.CENTER_ALIGN;
        par.pointSize = fontSize;
        try {par.appliedFont = fontName} catch (e) {};
        try {par.fontStyle = 'Regular'} catch (e) {};
        try {
            if (createOutlines)
            tf = tf.createOutlines(true);
        } catch (e) {}
        pageItems = pageItems.concat(tf);
    }
    
    var writeDigit = function(binKey, pos, len, num, shiftChar) {
        shiftChar = shiftChar || 0;
        writeChar(pos + shiftChar, num)
        var lines = binKey.lines;
        var draw = binKey.start == 1;
        for (var i = 0, l = lines.length; i < l; ++i) {
            if (draw)
                writeLine(pos, lines[i], len);
            draw = !draw;
            pos += lineWidth * lines[i];
        }
        return pos;
    }
    
    var get_ean8 = function(s, pos) {
        pos = writeDigit(separators.ean13_start, pos, separatorHeight);
        for (var i = 0; i <= 3; i++) {
            var  binKey = getCode(s.charAt(i), 'L');
            pos = writeDigit(binKey, pos, lineHeight, s.charAt(i), 0.12);
        }
        pos = writeDigit(separators.ean13, pos, separatorHeight);
        for (i = 4; i <= 7; i++) {
            binKey = getCode(s.charAt(i), 'R');
            pos = writeDigit(binKey, pos, lineHeight, s.charAt(i), -0.12);
        }
        pos = writeDigit(separators.ean13_start, pos, separatorHeight);
        return pos;
    }
    
    var get_ean13 = function(s, pos) {
        s = get_validChecksum(s);
        var codeArray = ean13_array[parseInt(s.charAt(0))];
        writeChar(pos - 3.65, s.charAt(0));
        pos = writeDigit(separators.ean13_start, pos, separatorHeight);
        for(var i = 1; i <= 6; i++)
        {
            var n = codeArray.charAt(i - 1);
            var binKey = getCode(s.charAt(i), n);
            pos = writeDigit(binKey, pos, lineHeight, s.charAt(i), 0.12);
        }
        pos = writeDigit(separators.ean13, pos, separatorHeight);
        var n = 'R';
        for(i = 7; i <= 12; i++)
        {
            var binKey = getCode(s.charAt(i), n);
            pos = writeDigit(binKey, pos, lineHeight, s.charAt(i), -0.12);
        }
        pos = writeDigit(separators.ean13_start, pos, separatorHeight);
        return pos;
    }
    
    var get_eanExt = function(s, pos) {
        var codeArray, checksum = 0;
        switch (s.length) {
            case 2:
                codeArray = ean13_2_array[parseInt(s) % 4];
                break;
            case 5:    
                for (var i = 0, l = s.length; i < l; ++i)
                    checksum += (i % 2 ? 9 : 3) * parseInt(s.charAt(i));
                checksum %= 10;
                codeArray = ean13_5_array[checksum];
                break;
            default:
                return pos;
        }
        pos = writeDigit(separators.ean5_start, pos + 3, lineHeight);
        for (i = 0; i < s.length; i++) {
            if (i > 0)
                pos = writeDigit(separators.ean5, pos, lineHeight);
            var binKey = getCode(s.charAt(i), codeArray.charAt(i));
            pos = writeDigit(binKey, pos, lineHeight, s.charAt(i));
        }
        return pos;
    }
    
    var get_validChecksum = function(s) {
        var checksum = 0;
        for (var i = 0; i < 12; i++) {
            if ((13 + i) % 2 == 0)
                checksum += 3 * parseInt(s.charAt(i));
            else
                checksum += parseInt(s.charAt(i));
        }
        checksum %= 10;
        checksum = (10 - checksum) % 10;
        return s + checksum;
    }
    
    var writeBG = function(right) {
        var rect = page.rectangles.add();
        rect.sendToBack();
        rect.applyObjectStyle(doc.objectStyles[0]);
        rect.strokeColor = "None";
        rect.fillColor = "Paper";
        rect.fillTint = -1;
        rect.geometricBounds = [0, 0, '31mm', right + 'mm']; //top, left, bottom, right
        pageItems.push(rect);
    }
    
    switch (code.length) {
        case 8:
            var pos = get_ean8(code, leftSpace);
            break;
        case 12: // without checksum
            var pos = get_ean13(code, leftSpace);
            break;
        default:
            return null;
    }
    pos = get_eanExt(ext, pos);
    if (addGT)
        writeChar(pos + 1.65, '>');
    writeBG(pos + rightSpace);
    return page.groups.add(pageItems);
}
