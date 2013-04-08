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

// 2013-04-08

#script 'EAN_Barcode_Generator.jsx'
#target 'indesign'

;(function() {

    var scriptName = 'EAN Barcode Generator';
    
    var document = app.documents.length ? app.activeDocument : null;
    
    // read preferences
    var prefs = {
        script:    scriptName,
        type:      'EAN-13',
        code1:     '123456789012',
        code2:     '',
        rightMark: true,
        outlines:  true
    }
    var prefsFile = new File(Folder.userData.absoluteURI + '/EAN_Barcode_Generator.prefs');

    if (prefsFile.exists && prefsFile.open('r')) {
        try {
            prefs = eval(prefsFile.read());
        } catch (e) {}
        prefsFile.close();
    }

    // select type dialog
    var dialog = app.dialogs.add();
    dialog.name = scriptName;
    var column = dialog.dialogColumns.add();
    column.dialogRows.add().staticTexts.add({staticLabel: 'Choice the Type of Barcode:'});
    var rbgType = column.radiobuttonGroups.add();

    var bcTypes = ['EAN-8', 'EAN-8+2', 'EAN-8+5', 'EAN-13', 'EAN-13+2', 'EAN-13+5'];

    for (var i = 0, l = bcTypes.length; i < l; i++ ) {
        
        rbgType.radiobuttonControls.add({
            staticLabel: bcTypes[i], 
            checkedState: prefs.type == bcTypes[i]});
    }

    if (!dialog.show()) exit();
        
    var type = rbgType.selectedButton;
    var selTypeName = rbgType.radiobuttonControls[type].staticLabel;
    var withExt = type != 0 && type != 3;
    dialog.destroy();

    // input digits dialog
    var dialog = app.dialogs.add();
    dialog.name = scriptName;
    var column = dialog.dialogColumns.add();
    column.dialogRows.add().staticTexts.add({
        staticLabel: 'Type ' + [8, '8+2', '8+5', 12, '12+2', '12+5'][type] + 
        ' digits' + (type > 2 ? ' (excluding checksum)' : '')});
    var row = column.dialogRows.add();
    var dig1 = row.textEditboxes.add({editContents: prefs.code1, minWidth: 120});

    if (type != 0 && type != 3) {
        var dig2 = row.textEditboxes.add({editContents: prefs.code2, minWidth: 60});
    }
    var addGT = column.dialogRows.add().checkboxControls.add({
            staticLabel:  'Add ">" at the End', 
            checkedState: !!prefs.rightMark});
    var createOutlines = column.dialogRows.add().checkboxControls.add({
            staticLabel:  'Create Text Outlines', 
            checkedState: !!prefs.outlines});

    while (true) {
        if (!dialog.show())
            exit();
        // check input
        var l = dig1.editContents.length;
        var L = type < 3 ? 8 : 12;
        if (l != L) {
            alert(scriptName + '\rNeed type ' + L + ' digits in first area (now is ' + l + ')');
            continue;		
        }
        if (withExt) {
            l = dig2.editContents.length;
            L = (1 == type || 4 == type) ? 2 : 5; 
            if (l != L) {
                alert(scriptName + '\rNeed type ' + L + ' digits in second area (now is ' + l + ')');
                continue;
            }
        }
        var nonDigits = function(value) {
            return value.search('^[0-9]+');
        }
        if (nonDigits(dig1.editContents) || (withExt && nonDigits(dig2.editContents))) {
            alert(scriptName + '\rEAN barcode can only be composed of digits!');
            continue;
        }
        break;
    }

    // save preferences
    prefs.script    = scriptName;
    prefs.type      = selTypeName;
    prefs.code1     = dig1.editContents;
    prefs.code2     = withExt ? dig2.editContents : '';
    prefs.rightMark = addGT.checkedState;
    prefs.outlines  = createOutlines.checkedState;

    prefsFile.open('w') && prefsFile.write(prefs.toSource());
    prefsFile.close();

    var doc = app.documents.add();
    doc.zeroPoint = ['80mm', '110mm'];
    var page = doc.pages.item(0);

    app.selection = new BarCode(page, 
        dig1.editContents, 
        withExt ? dig2.editContents : '', 
        addGT.checkedState, 
        createOutlines.checkedState);

    doc.zeroPoint = [0, 0];
    
    if (document) {
        app.cut();
        app.activeDocument.close(SaveOptions.NO);
        app.paste();
    }
    dialog.destroy();
})();

// **************************************************************************

function BarCode(page, code, ext, addGT, createOutlines) {
	var lineWidth = 0.33; // mm
	var lineHeight = 22.85;
	var separatorHeight = 24.5;
	var topSpace = 3;
	var leftSpace = 4;
	var rightSpace = 4;
	var charPaddingTop = 0.33;
	var fontSize = '11pt';
	var fontName = 'Arial';
	
	// see http://en.wikipedia.org/wiki/European_Article_Number
	var ean13_array = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 
	                   'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
	// see http://en.wikipedia.org/wiki/EAN_2
	var ean13_2_array = ['LL', 'LG', 'GL', 'GG'];
	// see http://en.wikipedia.org/wiki/EAN_5
	var ean13_5_array = ['GGLLL', 'GLGLL', 'GLLGL', 'GLLLG', 'LGGLL', 
	                     'LLGGL', 'LLLGG', 'LGLGL', 'LGLLG', 'LLGLG'];
	var ean13_digits = [
	//	L-code only 
		[3, 2, 1, 1],	// 0	...||.|
		[2, 2, 2, 1],	// 1	..||..|
		[2, 1, 2, 2],	// 2	..|..||
		[1, 4, 1, 1],	// 3	.||||.|
		[1, 1, 3, 2],	// 4	.|...||
		[1, 2, 3, 1],	// 5	.||...|
		[1, 1, 1, 4],	// 6	.|.||||
		[1, 3, 1, 2],	// 7	.|||.||
		[1, 2, 1, 3],	// 8	.||.|||
		[3, 1, 1, 2]	 // 9	...|.||
	];
	
	var separators = {
		ean13_start: {start:1, lines:[1, 1, 1]},     // 	|.|
		ean13: {start:0, lines:[1, 1, 1, 1, 1]},     // 	.|.|.
		ean5_start: {start:0, lines:[1, 1, 1, 2]},   // 	.|.||
		ean5: {start:0, lines:[1, 1]}                // 	.|
	}
	
	var pageItems = new Array();
	
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
	
	var writeLine = function(pos, width, fillColor, len) {
		var rect = page.rectangles.add();
		rect.strokeWeight = 0;
		rect.strokeColor = 'None';
		rect.fillColor = fillColor;
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
		tf.strokeWeight = 0;
		tf.strokeColor = 'None';
		tf.fillColor = 'None';
		tf.fillTint = -1;
		tf.geometricBounds = [
			top + 'mm', 
			left + 'mm', 
			(top + 4) + 'mm', 
			(left + 4) + 'mm'
		]; 
		tf.contents = chr;
		var par = tf.paragraphs.item(-1);
		par.justification = Justification.leftAlign;
		par.pointSize = fontSize;
		par.appliedFont = fontName;
		par.fontStyle = 'Regular';
		if (createOutlines)
			tf = tf.createOutlines(true);
		pageItems = pageItems.concat(tf);
	}
	
	var writeDigit = function(binKey, pos, len, num) {
		writeChar(pos + 0.1, num)
		var lines = binKey.lines;
		var draw = binKey.start == 1;
		for (var i = 0, l = lines.length; i < l; ++i) {
			if (draw)
				writeLine(pos, lines[i], 'Black', len);
			draw = !draw;
			pos += lineWidth * lines[i];
		}
		return pos;
	}
	
	var get_ean8 = function(s, pos) {
		pos = writeDigit(separators.ean13_start, pos, separatorHeight);
		for (var i = 0; i <= 3; i++) {
			var  binKey = getCode(s.charAt(i), 'L');
			pos = writeDigit(binKey, pos, lineHeight, s.charAt(i));
		}
		pos = writeDigit(separators.ean13, pos, separatorHeight);
		for (i = 4; i <= 7; i++) {
			binKey = getCode(s.charAt(i), 'R');
			pos = writeDigit(binKey, pos, lineHeight, s.charAt(i));
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
			pos = writeDigit(binKey, pos, lineHeight, s.charAt(i));
		}
		pos = writeDigit(separators.ean13, pos, separatorHeight);
		var n = 'R';
		for(i = 7; i <= 12; i++)
		{
			var binKey = getCode(s.charAt(i), n);
			pos = writeDigit(binKey, pos, lineHeight, s.charAt(i));
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
		rect.strokeColor = 'None';
		rect.fillColor = 'Paper';
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
