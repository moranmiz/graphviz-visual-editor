import React from "react";
import 'typeface-roboto';
import PropTypes from 'prop-types';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import { withStyles } from '@material-ui/core/styles';
import withRoot from '../withRoot';
import ButtonAppBar from '../ButtonAppBar';
import Graph from '../Graph';
import TextEditor from '../TextEditor';
import MainMenu from '../MainMenu';
import HelpMenu from '../HelpMenu';
import SettingsDialog from '../SettingsDialog';
import OpenFromBrowserDialog from '../OpenFromBrowserDialog';
import SaveAsToBrowserDialog from '../SaveAsToBrowserDialog';
import InsertPanels from '../InsertPanels';
import FormatDrawer from '../FormatDrawer';
import { schemeCategory10 as d3_schemeCategory10} from 'd3-scale-chromatic';
import { schemePaired as d3_schemePaired} from 'd3-scale-chromatic';
import KeyboardShortcutsDialog from '../KeyboardShortcutsDialog';
import MouseOperationsDialog from '../MouseOperationsDialog';
import AboutDialog from '../AboutDialog';
import { parse as qs_parse } from 'qs';
import { stringify as qs_stringify } from 'qs';
import ExportAsUrlDialog from '../ExportAsUrlDialog';
import { graphDot } from '../utils/graphSrc_apple_cake'
import { graphDict, graphIngrDict, graphToolDict } from '../utils/graph_dict_apple_cake'
import TogglesPanel from '../Toggles';

const styles = theme => ({
  root: {
    textAlign: "center",
  },
  paper: {
    height: "calc(100vh - 64px - 2 * 12px)",
  }
});

const defaultElevation = 2;
const focusedElevation = 8;

class Index extends React.Component {

  constructor(props) {
    super(props);
    let dotSrc = null
    if (dotSrc == null) {
      dotSrc = graphDot;
    }
    // let updatedGraphDict = null
    // if (updatedGraphDict == null){
    //   updatedGraphDict = {...graphDict};
    // }

    this.state = {
      projects: JSON.parse(localStorage.getItem('projects')) || {},
      initialized: false,
      name: localStorage.getItem('name') || '',
      dotSrc: dotSrc,
      updatedGraphDict: {...graphDict}, 
      dotSrcLastChangeTime: +localStorage.getItem('dotSrcLastChangeTime') || Date.now(),
      svg: localStorage.getItem('svg') || '',
      hasUndo: false,
      hasRedo: false,
      mainMenuIsOpen: false,
      helpMenuIsOpen: false,
      settingsDialogIsOpen: false,
      openFromBrowserDialogIsOpen: false,
      saveToBrowserAsDialogIsOpen: false,
      replaceName: '',
      exportAsUrlDialogIsOpen: false,
      insertPanelsAreOpen: false,
      nodeFormatDrawerIsOpen: (localStorage.getItem('nodeFormatDrawerIsOpen') || 'false') === 'true',
      edgeFormatDrawerIsOpen: (localStorage.getItem('edgeFormatDrawerIsOpen') || 'false') === 'true',
      keyboardShortcutsDialogIsOpen: false,
      mouseOperationsDialogIsOpen: false,
      aboutDialogIsOpen: false,
      fitGraph : localStorage.getItem('fitGraph') === 'true',
      transitionDuration: localStorage.getItem('transitionDuration') || 1,
      tweenPaths : localStorage.getItem('tweenPaths') !== 'false',
      tweenShapes : localStorage.getItem('tweenShapes') !== 'false',
      tweenPrecision : localStorage.getItem('tweenPrecision') || '1%',
      engine : localStorage.getItem('engine') || 'dot',
      defaultNodeAttributes: JSON.parse(localStorage.getItem('defaultNodeAttributes')) || {},
      defaultEdgeAttributes: JSON.parse(localStorage.getItem('defaultEdgeAttributes')) || {},
      error: null,
      holdOff: localStorage.getItem('holdOff') || 0.2,
      fontSize: localStorage.getItem('fontSize') || 12,
      tabSize: +localStorage.getItem('tabSize') || 4,
      selectedGraphComponents: [],
    };
  }

  componentDidUpdate(prevProps,prevState){
    console.log('');
  }

  componentDidMount() {
    const urlParams = qs_parse(window.location.search.slice(1));
    if (urlParams.dot) {
      const currentDotSrc = this.state.dotSrc;
      const newDotSrc = urlParams.dot;
      if (newDotSrc !== currentDotSrc) {
        const names = Object.keys(this.state.projects).filter((name) => {
          const project = this.state.projects[name];
          return newDotSrc === project.dotSrc;
        });
        if (names.length > 0) {
          this.handleOpenFromBrowser(names[0]);
        } else {
          const newName = this.createUntitledName(this.state.projects, this.state.name);
          this.handleSaveAsToBrowser(newName, newDotSrc);
        }
      }
      window.history.pushState(null, null, window.location.pathname);
    }
    document.onblur = () => {
      // Needed when the user clicks outside the document,
      // e.g. the browser address bar
      this.setFocus(null);
    }
  }

  setPersistentState = (updater) => {
    this.setState((state) => {
      if (typeof updater === 'function') {
        var obj = updater(state);
      } else {
        obj = updater;
      }
      if (obj != null) {
        Object.keys(obj).forEach((key) => {
          let value = obj[key];
          if (typeof value === 'boolean') {
            value = value.toString();
          }
          else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          localStorage.setItem(key, value);
        });
      }
      return obj;
    });
  }

  addNode = ({lbael, nodeId, kuku}) =>{
    const originalGraph = this.state.dotSrc;
    const lastClosure = originalGraph.lastIndexOf("}");
    debugger
    if(lastClosure === -1){
      return;
    }
    const closureChar = "}";
    const template = `${nodeId} [label="(${nodeId})\\n\\ncook\\n\\ncooking pot (2%)\\n\\n10 minute - 35 minute" fillcolor="#3888c0" style=filled]`
    const patternToAdd = template+closureChar;

    this.setState({
      dotSrc: `${originalGraph.substring(0,lastClosure)}${patternToAdd}`
    })
    console.log('omri');
  }

  handleTextChange = (text, undoRedoState) => {
    this.setPersistentState((state) => {
      const newState = {
        name: state.name || (text ? this.createUntitledName(state.projects) : ''),
        dotSrc: text,
      };
      if (!this.disableDotSrcLastChangeTimeUpdate) {
        newState.dotSrcLastChangeTime = Date.now();
      }
      return newState;
    });
    this.disableDotSrcLastChangeTimeUpdate = false;
    if (this.resetUndoAtNextTextChange) {
      this.resetUndoStack();
      undoRedoState = {
        hasUndo: false,
        hasRedo: false,
      };
      this.resetUndoAtNextTextChange = false;
    }
    this.setState(undoRedoState);
  }

  handleMainMenuButtonClick = (anchorEl) => {
    this.setState({
      mainMenuIsOpen: true,
      mainMenuAnchorEl: anchorEl,
    });
  }

  handleNewClick = () => {
    this.handleSaveAsToBrowser('');
    this.resetUndoAtNextTextChange = true;
  }

  handleRenameClick = () => {
    this.setState({
      rename: true,
      saveToBrowserAsDialogIsOpen: true,
    });
  }

  handleExportAsUrlClick = () => {
    this.setState({
      exportAsUrlDialogIsOpen: true,
    });
  }

  handleExportAsUrlClose = () => {
    this.setState({
      exportAsUrlDialogIsOpen: false,
    });
  }

  handleUndoButtonClick = () => {
    this.undo();
  }

  handleRedoButtonClick = () => {
    this.redo();
  }

  handleMainMenuClose = () => {
    this.setState({
      mainMenuIsOpen: false,
    });
  }

  handleHelpButtonClick = (anchorEl) => {
    this.setState({
      helpMenuIsOpen: true,
      helpMenuAnchorEl: anchorEl,
    });
  }

  handleHelpMenuClose = () => {
    this.setState({
      helpMenuIsOpen: false,
    });
  }

  handleInsertButtonClick = () => {
    this.setFocusIf('insertPanelsAreOpen', null, 'InsertPanels')
    this.setPersistentState({
      insertPanelsAreOpen: !this.state.insertPanelsAreOpen,
    });
  }

  handleNodeFormatButtonClick = () => {
    this.setFocusIf('nodeFormatDrawerIsOpen', null, 'NodeFormatDrawer')
    this.setPersistentState({
      nodeFormatDrawerIsOpen: !this.state.nodeFormatDrawerIsOpen,
      edgeFormatDrawerIsOpen: false,
    });
  }

  handleNodeFormatDrawerClose = () => {
    this.setPersistentState({
      nodeFormatDrawerIsOpen: false,
    });
    this.setFocus(null);
  }

  handleEdgeFormatButtonClick = () => {
    this.setFocusIf('edgeFormatDrawerIsOpen', null, 'EdgeFormatDrawer')
    this.setPersistentState({
      edgeFormatDrawerIsOpen: !this.state.edgeFormatDrawerIsOpen,
      nodeFormatDrawerIsOpen: false,
    });
  }

  handleEdgeFormatDrawerClose = () => {
    this.setPersistentState({
      edgeFormatDrawerIsOpen: false,
    });
    this.setFocus(null);
  }

  handleSettingsClick = () => {
    this.setState({
      settingsDialogIsOpen: true,
    });
  }

  handleSettingsClose = () => {
    this.setState({
      settingsDialogIsOpen: false,
    });
  }

  handleOpenFromBrowserClick = () => {
    this.setState({
      openFromBrowserDialogIsOpen: true,
    });
  }

  handleOpenFromBrowserClose = () => {
    this.setState({
      openFromBrowserDialogIsOpen: false,
    });
  }

  handleOpenFromBrowser = (newCurrentName) => {
    const currentName = this.state.name;
    if (newCurrentName !== currentName) {
      this.setPersistentState(state => {
        const projects = {...state.projects};
        if (currentName) {
          const currentProject = {
            dotSrc: state.dotSrc,
            dotSrcLastChangeTime: state.dotSrcLastChangeTime,
            svg: this.getSvgString(),
          };
          projects[currentName] = currentProject;
        }
        const newCurrentProject = projects[newCurrentName];
        delete projects[newCurrentName];
        this.disableDotSrcLastChangeTimeUpdate = true;
        return {
          name: newCurrentName,
          ...newCurrentProject,
          projects: projects,
        }
      });
      this.resetUndoAtNextTextChange = true;
    }
    this.handleOpenFromBrowserClose();
  }

  createUntitledName = (projects, currentName) => {
    const baseName = 'Untitled Graph';
    let newName = baseName;
    while (projects[newName] || newName === currentName) {
      newName = baseName + ' ' + (+newName.replace(baseName, '') + 1);
    }
    return newName;
  }

  handleOpenFromBrowserDelete = (nameToDelete) => {
    this.setPersistentState((state) => {
      const currentName = state.name;
      if (nameToDelete === currentName) {
        return {
          name: '',
          dotSrc: '',
          dotSrcLastChangeTime: Date.now(),
        }
      } else {
        const projects = {...state.projects};
        delete projects[nameToDelete];
        return {
          projects: projects,
        }
      }
    });
  }

  handleSaveAsToBrowserClick = () => {
    this.setState({
      rename: false,
      saveToBrowserAsDialogIsOpen: true,
    });
  }

  handleSaveAsToBrowserClose = () => {
    this.setState({
      saveToBrowserAsDialogIsOpen: false,
    });
  }

  handleSaveAsToBrowser = (newName, newDotSrc) => {
    const currentName = this.state.name;
    if (newName !== currentName) {
      this.setPersistentState((state) => {
        const projects = {...state.projects};
        delete projects[newName];
        if (currentName && !state.rename) {
          const currentProject = {
            dotSrc: this.state.dotSrc,
            dotSrcLastChangeTime: state.dotSrcLastChangeTime,
            svg: this.getSvgString(),
          };
          projects[currentName] = currentProject;
        }
        return {
          projects: {
            ...projects,
          },
          name: newName,
          dotSrc: newDotSrc ? newDotSrc : (newName ? state.dotSrc : ''),
          dotSrcLastChangeTime: newDotSrc ? Date.now() : state.dotSrcLastChangeTime,
        };
      });
    }
    this.handleSaveAsToBrowserClose();
  }

  handleEngineSelectChange = (engine) => {
    this.setPersistentState({
      engine: engine,
    });
  }

  handleFitGraphSwitchChange = (fitGraph) => {
    this.setPersistentState({
      fitGraph: fitGraph,
    });
  }

  handleTransitionDurationChange = (transitionDuration) => {
    this.setPersistentState({
      transitionDuration: transitionDuration,
    });
  }

  handleTweenPathsSwitchChange = (tweenPaths) => {
    this.setPersistentState({
      tweenPaths: tweenPaths,
    });
  }

  handleTweenShapesSwitchChange = (tweenShapes) => {
    this.setPersistentState({
      tweenShapes: tweenShapes,
    });
  }

  handleTweenPrecisionChange = (tweenPrecision) => {
    this.setPersistentState({
      tweenPrecision: tweenPrecision,
    });
  }

  handleHoldOffChange = (holdOff) => {
    this.setPersistentState({
      holdOff: holdOff,
    });
  }

  handleFontSizeChange = (fontSize) => {
    this.setPersistentState({
      fontSize: fontSize,
    });
  }

  handleTabSizeChange = (tabSize) => {
    this.setPersistentState({
      tabSize: tabSize,
    });
  }

  handleNodeShapeClick = (shape) => {
    let x0 = null;
    let y0 = null;
    this.insertNode(x0, y0, {shape: shape});
  }

  handleNodeStyleChange = (style) => {
    this.setPersistentState(state => ({
      defaultNodeAttributes: {
          ...state.defaultNodeAttributes,
        style: style,
      },
    }));
  }

  handleNodeColorChange = (color) => {
    this.setPersistentState(state => ({
      defaultNodeAttributes: {
          ...state.defaultNodeAttributes,
        color: color,
      },
    }));
  }

  handleNodeFillColorChange = (color) => {
    this.setPersistentState(state => ({
      defaultNodeAttributes: {
          ...state.defaultNodeAttributes,
        fillcolor: color,
      },
    }));
  }

  handleEdgeStyleChange = (style) => {
    this.setPersistentState(state => ({
      defaultEdgeAttributes: {
          ...state.defaultEdgeAttributes,
        style: style,
      },
    }));
  }

  handleEdgeColorChange = (color) => {
    this.setPersistentState(state => ({
      defaultEdgeAttributes: {
          ...state.defaultEdgeAttributes,
        color: color,
      },
    }));
  }

  handleEdgeFillColorChange = (color) => {
    this.setPersistentState(state => ({
      defaultEdgeAttributes: {
          ...state.defaultEdgeAttributes,
        fillcolor: color,
      },
    }));
  }

  handleKeyboardShortcutsClick = () => {
    this.setState({
      keyboardShortcutsDialogIsOpen: true,
    });
  }

  handleKeyboardShortcutsDialogClose = () => {
    this.setState({
      keyboardShortcutsDialogIsOpen: false,
    });
  }

  handleMouseOperationsClick = () => {
    this.setState({
      mouseOperationsDialogIsOpen: true,
    });
  }

  handleMouseOperationsDialogClose = () => {
    this.setState({
      mouseOperationsDialogIsOpen: false,
    });
  }

  handleAboutClick = () => {
    this.setState({
      aboutDialogIsOpen: true,
    });
  }

  handleAboutDialogClose = () => {
    this.setState({
      aboutDialogIsOpen: false,
    });
  }

  registerNodeShapeClick = (handleNodeShapeClick) => {
    this.handleNodeShapeClick = handleNodeShapeClick;
  }

  registerNodeShapeDragStart = (handleNodeShapeDragStart) => {
    this.handleNodeShapeDragStart = handleNodeShapeDragStart;
  }

  registerNodeShapeDragEnd = (handleNodeShapeDragEnd) => {
    this.handleNodeShapeDragEnd = handleNodeShapeDragEnd;
  }

  handleZoomInButtonClick = () => {}
  handleZoomOutButtonClick = () => {}
  handleZoomOutMapButtonClick = () => {}
  handleZoomResetButtonClick = () => {}

  registerZoomInButtonClick = (handleZoomInButtonClick) => {
    this.handleZoomInButtonClick = handleZoomInButtonClick;
  }

  registerZoomOutButtonClick = (handleZoomOutButtonClick) => {
    this.handleZoomOutButtonClick = handleZoomOutButtonClick;
  }

  registerZoomOutMapButtonClick = (handleZoomOutMapButtonClick) => {
    this.handleZoomOutMapButtonClick = handleZoomOutMapButtonClick;
  }

  registerZoomResetButtonClick = (handleZoomResetButtonClick) => {
    this.handleZoomResetButtonClick = handleZoomResetButtonClick;
  }

  registerGetSvg = (getSvg) => {
    this.getSvg = getSvg;
  }

  getSvgString() {
    const svg = this.getSvg();
    const serializer = new XMLSerializer();
    return svg ? serializer.serializeToString(svg) : this.state.svg;
  }

  handleGraphComponentSelect = (components) => {
    this.setState({
      selectedGraphComponents: components,
    });
  }

  handleGraphInitialized = () => {
    this.setState({
      graphInitialized: true,
    });
    this.setPersistentState({
      svg: this.getSvgString(),
    });
  }

  handleError = (error) => {
    if (error) {
      error.numLines = this.state.dotSrc.split('\n').length;
    }
    if (JSON.stringify(error) !== JSON.stringify(this.state.error)) {
      this.setState({
        error: error,
      });
    }
  }

  registerUndo = (undo) => {
    this.undo = undo;
  }

  registerRedo = (redo) => {
    this.redo = redo;
  }

  registerUndoReset = (resetUndoStack) => {
    this.resetUndoStack = resetUndoStack;
  }

  handleTextEditorFocus = () => {
    this.setFocus('TextEditor');
  }

  handleTextEditorBlur = () => {
    // Needed when the user clicks outside of a pane,
    // e.g. the app bar or the background
    this.setFocusIfFocusIs('TextEditor', null);
  }

  handleGraphFocus = () => {
    this.setFocus('Graph');
  }

  handleInsertPanelsClick = () => {
    this.setFocus('InsertPanels');
  }

  handleNodeFormatDrawerClick = () => {
    this.setFocusIf('nodeFormatDrawerIsOpen', 'NodeFormatDrawer', null)
  }

  handleEdgeFormatDrawerClick = () => {
    this.setFocus('EdgeFormatDrawer');
    this.setFocusIf('edgeFormatDrawerIsOpen', 'EdgeFormatDrawer', null)
  }

  setFocus = (focusedPane) => {
    this.setState((state) => (state.focusedPane !== focusedPane && {
      focusedPane: focusedPane,
    }) || null);
  }

  setFocusIfFocusIs = (currentlyFocusedPane, newFocusedPane) => {
    this.setState((state) => (state.focusedPane === currentlyFocusedPane && {
      focusedPane: newFocusedPane,
    }) || null);
  }

  setFocusIf = (stateProperty, focusedPaneIf, focusedPaneElse) => {
    this.setState((state) => {
      const focusedPane = state[stateProperty] ? focusedPaneIf: focusedPaneElse;
      return (state.focusedPane !== focusedPane && {
        focusedPane: focusedPane,
      }) || null;
    });
  }

  // changeNodeLabel = (nodeId, verb, ingredients, tools, time, color) => {
  changeNodeLabel = (nodeId, nodeContent, nodeColor) => {
    console.log("in changeNodeLable!!!")
    console.log("nodeId: " + nodeId) 
    console.log("nodeContent: " + nodeContent)
    console.log("nodeColor: " + nodeColor)
    let fullString = '';
    fullString =  this.state.dotSrc;
    let nodeString = '';
    const regex = new RegExp("\\t"+`${nodeId}`+"\\s\\[");
    const startIndex =  fullString.search(regex);
    console.log("here1")

    if(startIndex > -1){
      console.log("here2")
      const closingIndex = fullString.slice(startIndex).search(/\]/g) + startIndex;
      const a = fullString.substring(startIndex, closingIndex);
      const startPart = "\t" + `${nodeId}` + " [label="
      if(closingIndex > -1){
        // const verbPart = "<<font point-size='18'><b>" + verb + "</b><br/>" 
        // let ingrPart = "";
        // if (ingredients !== ""){
        //   // ingrPart = ingredients.split('\n').join('<br/>')
        //   ingrPart = ingrPart + "<br/>"
        // }
        // let toolPart = ""; 
        // if (tools !== ""){
        //   // toolPart = tools.split('\n').join('<br/>')
        //   toolPart = toolPart + "<br/>"
        // }
        // const timePart = (time === "") ? "" : time
        let leftovers = ` style=filled fillcolor="` + nodeColor + `"`
        if(a.includes("penwidth=5")){
          leftovers = leftovers + " color=springgreen4, penwidth=5";
        }else if(a.includes("penwidth=2")){
          leftovers = leftovers + " color=darkorange, penwidth=2";

        }
        if(a.includes(`fillcolor="#ffe4b5"`)){//orange
          leftovers = leftovers + ` fillcolor="#ffe4b5"`
        }
        if(a.includes(`fillcolor="#afcfaf"`)){//green
          leftovers = leftovers + ` fillcolor="#afcfaf"`
        }
        if(a.includes(`fillcolor="#db8a8a"`)){//red
          leftovers = leftovers + ` fillcolor="#db8a8a"`
        }
        leftovers = leftovers + "]"
        nodeString = startPart + nodeContent + leftovers;
        // nodeString = startPart + verbPart + ingrPart + toolPart + timePart + leftovers;
        console.log("node content: " + nodeContent)
        console.log(nodeString)

        const firstPart = fullString.substring(0, startIndex);
        const lastPart = fullString.substring(closingIndex + 1);
        fullString = firstPart.concat(nodeString.concat(lastPart));
      }
    }
    
    // console.log(fullString)
    this.setState({
      dotSrc : fullString
    })
  }

  enlargeContentByNodeIds = (prevArrayOfIds, curArrayOfIds)=>{
    let fullString = "";
    console.log(prevArrayOfIds)
    console.log(curArrayOfIds)
    let specialId = ""
    if (curArrayOfIds.length > prevArrayOfIds.length){ // in this case we want to enlarge the node that in curArray and not in prevArray
      // find the special node to enlarge:
      curArrayOfIds.forEach(node=>{
        specialId = (prevArrayOfIds.indexOf(node) == -1) ? node : specialId
      })
      console.log("enlarge!")
      console.log(specialId)
      // this.changeNodeLabel(specialId, graphDict[specialId].verb, graphDict[specialId].ingredients, graphDict[specialId].tool, graphDict[specialId].time, graphDict[specialId].color)
      let nodeColor = "#ffffff" // white 
      if(this.state.updatedGraphDict[specialId].color){
        nodeColor = this.state.updatedGraphDict[specialId].color
      }
      this.changeNodeLabel(specialId, this.state.updatedGraphDict[specialId].summary, nodeColor)
    }
    else{ // in this case we want to shrink the node that in prevArray and not in curArray
      prevArrayOfIds.forEach(node=>{
        specialId = (curArrayOfIds.indexOf(node) == -1) ? node : specialId
      })
      console.log("shrink!")
      console.log(specialId)
      // this.changeNodeLabel(specialId, graphDict[specialId].verb, graphDict[specialId].ingredients_abbr, graphDict[specialId].tool_abbr, graphDict[specialId].time, graphDict[specialId].color)
      let nodeColor = "#ffffff" // white 
      if(this.state.updatedGraphDict[specialId].color){
        nodeColor = this.state.updatedGraphDict[specialId].color
      }
      this.changeNodeLabel(specialId, this.state.updatedGraphDict[specialId].summary_abbr, nodeColor)
    }
  }

  intersect = (a, b)=> {
      return [...new Set(a)].filter(x => new Set(b).has(x));
  }

  markDirections = (updatedDict,constraintStr,nodeId, item)=>{
    updatedDict[nodeId] && updatedDict[nodeId].directions && updatedDict[nodeId].directions.forEach(direction=>{
      console.log(direction);
      console.log(direction.title);
      if (direction.title.includes(item)){
      direction.constraint = constraintStr;
      }
    })
    return updatedDict;
  }

  deleteConstraints = (updatedDict, colorsToDelete)=>{
      const nodeIds = Object.keys(updatedDict);
      nodeIds && nodeIds.forEach(nodeId=>{
        const obj = updatedDict[nodeId];
        if(obj && obj.directions){
          obj.directions.forEach(direction=>{
            if(direction.constraint && colorsToDelete.includes(direction.constraint)){
              delete  direction.constraint;
            }
          })
        }

      })
  }

  handleConstraints = (prevConstraints, currentConstraints) => {
    console.log("HANDLE CONSTRAINTS!!!!")

    const goodIngrNodeIds = [] 
    const badIngrNodeIds = []
    const goodToolNodeIds = [] 
    const badToolNodeIds = []
    let updatedDict = {...this.state.updatedGraphDict};
    let optionalBadNodes = []

    this.deleteConstraints(updatedDict,["GOOD","BAD"]);

    const nodesWithColor = [];

    // if (currentConstraints.timeMinHour || currentConstraints.timeMinMinute){
    //   console.log(currentConstraints.timeMinHour)
    //   console.log(currentConstraints.timeMinMinute)
    // }
    if (currentConstraints.timeMaxHour || currentConstraints.timeMaxMinute){
      console.log(currentConstraints.timeMaxHour)
      console.log(currentConstraints.timeMaxMinute)
      this.handleTime(currentConstraints.timeMaxHour, currentConstraints.timeMaxMinute, updatedDict)
    }

    if (currentConstraints.selectedIngredientsToAppear.length !== 0){
      console.log(currentConstraints.selectedIngredientsToAppear)

      currentConstraints.selectedIngredientsToAppear && currentConstraints.selectedIngredientsToAppear.forEach(ingr=>{
        // console.log(graphIngrDict[ingr]);
        // console.log(graphIngrDict[ingr].in_nodes);
        const inNodes = graphIngrDict[ingr].in_nodes;
        inNodes && inNodes.forEach(nodeId=>{
          if(!nodesWithColor.find(obj=>obj.id===nodeId)){
            nodesWithColor.push({id:nodeId, color:`"#afcfaf"`})
          }
          updatedDict = this.markDirections(updatedDict,"GOOD", nodeId,ingr);
        })
      })
    }

    if (currentConstraints.selectedPreferedTools.length !== 0){
      console.log(currentConstraints.selectedPreferedTools)
      currentConstraints.selectedPreferedTools && currentConstraints.selectedPreferedTools.forEach(tool=>{
        const inNodes = graphToolDict[tool].in_nodes;
        inNodes && inNodes.forEach(nodeId=>{
          if(!nodesWithColor.find(obj=>obj.id===nodeId)){
            nodesWithColor.push({id:nodeId, color:`"#afcfaf"`})
          }
          updatedDict = this.markDirections(updatedDict,"GOOD", nodeId,tool);
        })
      })
    }

    if (currentConstraints.selectedUnusedIngredients.length !== 0){
      console.log(currentConstraints.selectedUnusedIngredients) 
      currentConstraints.selectedUnusedIngredients && currentConstraints.selectedUnusedIngredients.forEach(ingr=>{
        // console.log(graphIngrDict[ingr]);
        // console.log(graphIngrDict[ingr].in_nodes);
        const inNodes = graphIngrDict[ingr].in_nodes;
        inNodes && inNodes.forEach(nodeId=>{
          updatedDict = this.markDirections(updatedDict,"BAD", nodeId,ingr);
        })
      })
    }

    if (currentConstraints.selectedUnusedTools.length !== 0){
      console.log(currentConstraints.selectedUnusedTools)
      currentConstraints.selectedUnusedTools && currentConstraints.selectedUnusedTools.forEach(tool=>{
        const inNodes = graphToolDict[tool].in_nodes;
        inNodes && inNodes.forEach(nodeId=>{
          updatedDict = this.markDirections(updatedDict,"BAD", nodeId,tool);
        })
      })
    }


    const allDirectionAreBadNodes = this.allDirectionsAreBad(updatedDict)
    nodesWithColor.push(...allDirectionAreBadNodes);


    // const combinedToolsNIngredients = [
    //   ...currentConstraints.selectedPreferedTools,
    //   ...currentConstraints.selectedIngredientsToAppear,
    //   ...currentConstraints.selectedUnusedTools,
    //   ...currentConstraints.selectedUnusedIngredients
    // ];

    // this.updateCurGraphDict(combinedTollsNIngredients,nodesWithColor);
    // update good constraints:
    // this.updateCurGraphDict(currentConstraints.selectedIngredientsToAppear, goodIngrNodeIds, "GOOD") // update good ingredients
    // this.updateFillColorByNodeIds(nodesWithColor) // color nodes that contain good constraints
    // this.updateCurGraphDict(currentConstraints.selectedPreferedTools, goodToolNodeIds, "GOOD") //update good tools.
    // this.updateFillColorByNodeIds(goodToolNodeIds, `"#afcfaf"`) // color nodes that contain good tools.
    
    // update bad constraints:
    // 
    // this.updateCurGraphDict(currentConstraints.selectedUnusedIngredients, badIngrNodeIds, "BAD") 
    // this.updateCurGraphDict(currentConstraints.selectedUnusedTools, badToolNodeIds, "BAD")
    
    let fullString = this.state.dotSrc;
    fullString = fullString.split(` fillcolor="#afcfaf"`).join(""); // reset all good colors
    fullString = fullString.split(` fillcolor="#db8a8a"`).join(""); // reset all bad colors
    this.setState({
      dotSrc:fullString,
      updatedGraphDict:updatedDict
    },()=>{this.updateFillColorByNodeIds(nodesWithColor)})
    // this.updateFillColorByNodeIds(allDirectionAreBadNodes, `"#db8a8a"`)

  }

  handleTime = (maxHour, maxMinute, updatedDict) => {
    
    console.log("handleTime")
    
    var totalTimeMinutes = 0
    var colorRedNodes = []

    if (maxHour){
      totalTimeMinutes = totalTimeMinutes + 60*maxHour
    }
    if (maxMinute){
      totalTimeMinutes = totalTimeMinutes + maxMinute
    }
    console.log(totalTimeMinutes)

    // const updatedDict = {...this.state.updatedGraphDict}
    const keys = Object.keys(updatedDict);
    console.log(keys)

    keys && keys.forEach(nodeId=>{
      // console.log(updatedDict[nodeId])
      if (!updatedDict[nodeId].hidden && updatedDict[nodeId].time_description_full_info && Object.keys(updatedDict[nodeId].time_description_full_info).length!==0){
        console.log(nodeId)
        console.log(updatedDict[nodeId])
        const start_range = updatedDict[nodeId].time_description_full_info.start_range
        const unit = updatedDict[nodeId].time_description_full_info.start_unit
        const nodeMinTimeMinutes = unit==="minute" ? start_range: (unit==="hour"? 60*start_range: 0)
        console.log(nodeMinTimeMinutes) 
        updatedDict[nodeId].directions && updatedDict[nodeId].directions.forEach(direction=>{
          const directionMinTimeMinutes = direction.min_time_unit==="minute" ? direction.min_time: (direction.min_time_unit==="hour"? 60*direction.min_time: 0)
          if (totalTimeMinutes < directionMinTimeMinutes){
            // console.log(direction.title)
            direction.constraint = "BAD";
          }
        })          
      }
    })
    
  }

 allBad = (nodeObj) =>{
   return nodeObj && nodeObj.directions && nodeObj.directions.every(direction=>{
     return direction.constraint === 'BAD';
   })
 }

  allDirectionsAreBad = (updatedDict) => {
    const ids = Object.keys(updatedDict);
    const badIds = ids && ids.filter(id=>{
      const nodeObj = updatedDict[id];
      if(nodeObj && !nodeObj.hidden && nodeObj.directions && this.allBad(nodeObj)){
        return nodeObj;
      }
    });
    return badIds.map(id=>{
      return {id, color:`"#db8a8a"`}
    })
  }

  findNodesByIngredients = (leastCommonIngredients) =>{
    console.log("least common!!")
    console.log(leastCommonIngredients) 
    debugger
    var nodeIds = []
    leastCommonIngredients && leastCommonIngredients.forEach(ingr=>{
      // console.log(graphIngrDict[ingr]);
      // console.log(graphIngrDict[ingr].in_nodes);
      const inNodes = graphIngrDict[ingr].in_nodes;
      inNodes && inNodes.forEach(node=>{
        if(nodeIds.indexOf(node) === -1){
          nodeIds.push(node)
        }
      })
    })
    // console.log("nodeIds:")
    // console.log(nodeIds)

    
    this.addSpecialPaths(leastCommonIngredients, nodeIds)
    // this.updateFillColorByNodeIds(nodeIds)  
    // this.updateCurGraphDict(leastCommonIngredients, nodeIds) 
    
  }

  addSpecialPaths = (uncommonIngredients, nodeIds)=>{
    console.log("add special paths")
    let fullString = "";
    fullString = this.state.dotSrc;
    //remove START_SPECIAL ... END_SPECIAL part from dot source:
    const specialStartInx = fullString.search(new RegExp("\\n\\t#START_SPECIAL\\n"));
    const specialEndInx = fullString.search(new RegExp("\\t#END_SPECIAL\\n\\n")); //length: 15 chars.
    fullString = fullString.split(fullString.slice(specialStartInx, specialEndInx + 15)).join("")

    //add START_SPEACIAL ... END_SPECIAL to dot source:
    const regex = new RegExp(`\\tlabelloc="t"`);
    const startInx = fullString.search(regex) 
    const srcStart = fullString.slice(0,startInx)
    let middle = "\n\t#START_SPECIAL\n"
    const srcEnd = fullString.slice(startInx)

    let lastNodeId = ""

    uncommonIngredients && uncommonIngredients.forEach(ingr=>{
      const paths = graphIngrDict[ingr].paths
      // paths && paths.forEach(path=>{
      if (paths){
        const path = paths[0];
        console.log(path)
        path && path.forEach(nodeId=>{
          // if node is hidden we want to add it and the edge for it in path:
          if(graphDict[nodeId].hidden){
            const nodeContent = graphDict[nodeId].summary_abbr
            middle = middle + "\t" + `${nodeId}` + " [label=" + nodeContent + " style=filled fillcolor=white color=darkorange penwidth=2]\n"; // adding node
            const edgeRegex = new RegExp(`${lastNodeId}` + "\s\-\>\s" + `${nodeId}`);
            const startEdgeReg = middle.search(edgeRegex)
            if (startEdgeReg === -1){
              middle = middle + "\t" + `${lastNodeId}` + " -> " + `${nodeId}` + " [color=darkorange penwidth=2]\n"; // adding edge
            }
          }else{
            if(lastNodeId && graphDict[lastNodeId].hidden){
              const edgeRegex = new RegExp(`${lastNodeId}` + "\s\-\>\s" + `${nodeId}`);
              const startEdgeReg = middle.search(edgeRegex)
              if (startEdgeReg === -1){
                middle = middle + "\t" + `${lastNodeId}` + " -> " + `${nodeId}` + " [color=darkorange penwidth=2]\n"; // adding edge
              }
            }
          }
          lastNodeId = nodeId;
        })
      }
    })

    middle = middle + "\t#END_SPECIAL\n\n"
    fullString = srcStart.concat(middle.concat(srcEnd))
    // console.log(fullString)

    const test = nodeIds && nodeIds.map(id=>{
      return {
        id: id,
        color:`"#ffe4b5"`
      };
    })

    this.setState({
      dotSrc : fullString
    }, () => {
      this.updateFillColorByNodeIds(test)
      this.updateCurGraphDict(uncommonIngredients, nodeIds, "UNCOMMON")
     })
  }

  updateFillColorByNodeIds = (arrayOfIds)=>{
    console.log("update fill color by node ID") // TODO: remove
    console.log(JSON.stringify(arrayOfIds))
    let fullString = "";
    fullString =  this.state.dotSrc;
    console.log(fullString)

    

    arrayOfIds && arrayOfIds.forEach(obj=>{
      const regex = new RegExp("\\t"+`${obj.id}`+"\\s\\[");
      const startIndex =  fullString.search(regex);
      if(startIndex > -1){
        const closingIndex = fullString.slice(startIndex).search(/\]/g) + startIndex;
        if(closingIndex > -1){
          const a = fullString.substring(startIndex,closingIndex);
          let nodeString = ""
          // console.log(a) 
          if(a.includes(`fillcolor=` + obj.color)){
            return
          }else{
            nodeString = a + ` fillcolor=` + obj.color + `]`;
          }
          const firstPart = fullString.substring(0,startIndex);
          const lastPart = fullString.substring(closingIndex+1);
          fullString = firstPart.concat(nodeString.concat(lastPart));
        }
      } else{
        return;
      }
    })

    this.setState({
      dotSrc : fullString
    })
  }

  // ingredientList can be also tools list.
  updateCurGraphDict =(ingredientOrToolList, nodeIds, constraintStr)=>{

    console.log("update cur graph dict") // TODO: remove
    console.log(nodeIds)
    let updatedDict = {...graphDict}
    nodeIds && nodeIds.forEach(id=>{
      console.log(id)
      ingredientOrToolList && ingredientOrToolList.forEach(uncommonIngr=>{
        console.log(uncommonIngr)
        const regex = new RegExp(uncommonIngr);
        updatedDict[id].directions && updatedDict[id].directions.forEach(direction=>{
          console.log(direction);
          console.log(direction.title);
          const startInx = direction.title.search(regex);
          if (startInx !== -1){
            direction.constraint = constraintStr;
            // updatedDict[id].directions.constraint = "UNCOMMON";
          }
        })
      })
    })

    if(nodeIds && !nodeIds.length){
      const nodeIds = Object.keys(updatedDict);
      nodeIds && nodeIds.forEach(nodeId=>{
        const obj = updatedDict[nodeId];
        if(obj && obj.directions){
          obj.directions.forEach(direction=>{
            if(direction.constraint && direction.constraint === constraintStr){ // "UNCOMMON"){
              delete  direction.constraint;
            }
          })
        }

      })
    } 

    console.log(updatedDict)
    console.log("here")

    this.setState({
      updatedGraphDict: updatedDict
    })
  }

  updateColorByNodeIds = (arrayOfIds, prevArrayOfEdges, arrayOfEdges)=>{
    console.log("update color by node ID") // TODO: remove
    console.log(arrayOfIds) // TODO: remove
    let fullString = "";
    fullString =  this.state.dotSrc;
    if(arrayOfIds.length === 0 || arrayOfIds.length === 1){
      fullString = fullString.split(" color=springgreen4, penwidth=7").join("");
      fullString = fullString.split(" color=springgreen4, penwidth=3").join("");
      fullString = fullString.split(" color=springgreen4, penwidth=5").join("");
      fullString = fullString.split("[color=springgreen4, penwidth=5]").join("");
    } 
    arrayOfIds && arrayOfIds.forEach(id=>{
      console.log("in for each")
      const regex = new RegExp("\\t"+`${id}`+"\\s\\[");
        const startIndex =  fullString.search(regex);
        console.log(startIndex) // TODO: remove
        if(startIndex > -1){
            const closingIndex = fullString.slice(startIndex).search(/\]/g) + startIndex;
            if(closingIndex > -1){
              const a = fullString.substring(startIndex,closingIndex);
              console.log("==="+a+"===") // TODO: remove
              if(a.includes("penwidth")){
                return
              }
              let nodeString = ""
              if(id == 0 || id == 1){
                nodeString = a + " color=springgreen4, penwidth=3]";
              }else{
                nodeString = a + " color=springgreen4, penwidth=7]";
              }
              const firstPart = fullString.substring(0,startIndex);
              const lastPart = fullString.substring(closingIndex+1);
              fullString = firstPart.concat(nodeString.concat(lastPart));
            }
        } else{
          return;
        }
      })

    let newEdges = []
    arrayOfEdges && arrayOfEdges.forEach(edge=>{
      if(prevArrayOfEdges.indexOf(edge) === -1){
        newEdges.push(edge) 
      }
    })

    console.log("new edges!")
    console.log(newEdges)
    newEdges && newEdges.forEach(edge=>{
      console.log(edge)
      const regexStr = `${edge.first}`+" -> " + `${edge.second}`
      const regex = new RegExp(regexStr);
      const regex2 = new RegExp(regexStr + " \\[");
      const startIndex = fullString.search(regex2);
      if(startIndex > -1){ 
        const endIndex = fullString.slice(startIndex).search(/\]/g) + startIndex;
        const a = fullString.substring(startIndex,endIndex);
        if(a.includes("color")){
          return
        }
        // const penWidthStart = fullString.slice(startIndex).search(/penwidth/g) + startIndex;
        const penWidthStart = fullString.slice(startIndex).search(/\]/g) + startIndex;
        const edgeStr = fullString.substring(startIndex, penWidthStart) + " color=springgreen4, penwidth=5]";
        const firstPart = fullString.substring(0, startIndex);
        const lastPart = fullString.substring(fullString.slice(startIndex).search(/\]/g) + startIndex + 1);
        fullString = firstPart.concat(edgeStr.concat(lastPart));
      }
      else{
        const startIndex = fullString.search(regex);
        const closingIndex = startIndex + regexStr.length + 1;
        const edgeStr = fullString.substring(startIndex, closingIndex) + " [color=springgreen4, penwidth=5]";
        const firstPart = fullString.substring(0, startIndex);
        const lastPart = fullString.substring(closingIndex);
        fullString = firstPart.concat(edgeStr.concat(lastPart));
      }
    })

    this.setState({
      dotSrc : fullString
    })
  }

  render() {
    const { classes } = this.props;
    const editorIsOpen = !this.state.nodeFormatDrawerIsOpen && !this.state.edgeFormatDrawerIsOpen;
    const textEditorHasFocus = this.state.focusedPane === 'TextEditor';
    const nodeFormatDrawerHasFocus = this.state.focusedPane === 'NodeFormatDrawer';
    const edgeFormatDrawerHasFocus = this.state.focusedPane === 'EdgeFormatDrawer';
    const insertPanelsHaveFocus = this.state.focusedPane === 'InsertPanels';
    const graphHasFocus = this.state.focusedPane === 'Graph';
    const leftPaneElevation = textEditorHasFocus || nodeFormatDrawerHasFocus || edgeFormatDrawerHasFocus? focusedElevation : defaultElevation;
    const rightPaneElevation = graphHasFocus ? focusedElevation : defaultElevation;
    const midPaneElevation = insertPanelsHaveFocus ? focusedElevation : defaultElevation;
    const showTextEditor = false; // MORAN
    const showToggles = true; // MORAN

    var columns;
    if (this.state.insertPanelsAreOpen && this.state.graphInitialized) {
      columns = {
        textEditor: 3,
        insertPanels: 3,
        graph: 6,
      }
    } else { /* browse */
      columns = {
        textEditor: showTextEditor ? 3 : 0,
        insertPanels: false,
        graph: showTextEditor ? 9 : 12,
      }
    }
    return (
      <div className={classes.root}>
        {/* FIXME: Find a way to get viz.js from the graphviz-visual-editor bundle */}
        <script src="https://unpkg.com/viz.js@1.8.2/viz.js" type="javascript/worker"></script>
        <Grid container
          spacing={24}
          style={{
            margin: 0,
            width: '100%',
          }}
        >
          {showTextEditor && <Grid item xs={columns.textEditor}>
            <Paper elevation={leftPaneElevation} className={classes.paper}>
              <div style={{display: editorIsOpen ? 'block' : 'none'}}>
                <TextEditor
                  // allocated viewport width - 2 * padding
                  width={`calc(${columns.textEditor * 100 / 12}vw - 2 * 12px)`}
                  dotSrc={this.state.dotSrc}
                  onTextChange={this.handleTextChange}
                  onFocus={this.handleTextEditorFocus}
                  onBlur={this.handleTextEditorBlur}
                  error={this.state.error}
                  selectedGraphComponents={this.state.selectedGraphComponents}
                  holdOff={this.state.holdOff}
                  fontSize={this.state.fontSize}
                  tabSize={this.state.tabSize}
                  registerUndo={this.registerUndo}
                  registerRedo={this.registerRedo}
                  registerUndoReset={this.registerUndoReset}
                />
              </div>
            </Paper>
          </Grid>}
          <Grid item xs={columns.graph}>
            
            <Grid container  direction="row" justify="flex-start" alignItems="flex-start" spacin={1}>
              {showToggles && <Grid item xs={showToggles ? 3 : 0}>
              <TogglesPanel findNodesByIngredients={this.findNodesByIngredients} handleConstraints={this.handleConstraints}/>
              </Grid>}
              <Grid item xs={showToggles ? 9 : 12}>
                <Paper elevation={rightPaneElevation} className={classes.paper}>
                  <Graph
                    updateColorByNodeIds = {this.updateColorByNodeIds}
                    enlargeContentByNodeIds = {this.enlargeContentByNodeIds}
                    addNode={this.addNode}
                    hasFocus={graphHasFocus}
                    updatedGraphDict = {this.state.updatedGraphDict}
                    dotSrc={this.state.dotSrc}
                    engine={this.state.engine}
                    fit={this.state.fitGraph}
                    transitionDuration={this.state.transitionDuration}
                    tweenPaths={this.state.tweenPaths}
                    tweenShapes={this.state.tweenShapes}
                    tweenPrecision={this.state.tweenPrecision}
                    defaultNodeAttributes={this.state.defaultNodeAttributes}
                    defaultEdgeAttributes={this.state.defaultEdgeAttributes}
                    onFocus={this.handleGraphFocus}
                    onTextChange={this.handleTextChange}
                    onHelp={this.handleKeyboardShortcutsClick}
                    onSelect={this.handleGraphComponentSelect}
                    onUndo={this.undo}
                    onRedo={this.redo}
                    registerNodeShapeClick={this.registerNodeShapeClick}
                    registerNodeShapeDragStart={this.registerNodeShapeDragStart}
                    registerNodeShapeDragEnd={this.registerNodeShapeDragEnd}
                    registerZoomInButtonClick={this.registerZoomInButtonClick}
                    registerZoomOutButtonClick={this.registerZoomOutButtonClick}
                    registerZoomOutMapButtonClick={this.registerZoomOutMapButtonClick}
                    registerZoomResetButtonClick={this.registerZoomResetButtonClick}
                    registerGetSvg={this.registerGetSvg}
                    onInitialized={this.handleGraphInitialized}
                    onError={this.handleError}
                  />
               </Paper>

              </Grid>
            </Grid>
              

          </Grid>
        </Grid>
        {this.state.helpMenuIsOpen &&
          <HelpMenu
            anchorEl={this.state.helpMenuAnchorEl}
            onMenuClose={this.handleHelpMenuClose}
            onKeyboardShortcutsClick={this.handleKeyboardShortcutsClick}
            onMouseOperationsClick={this.handleMouseOperationsClick}
            onAboutClick={this.handleAboutClick}
          />
        }
        {this.state.keyboardShortcutsDialogIsOpen &&
          <KeyboardShortcutsDialog
            onKeyboardShortcutsDialogClose={this.handleKeyboardShortcutsDialogClose}
          />
        }
        {this.state.mouseOperationsDialogIsOpen &&
          <MouseOperationsDialog
            onMouseOperationsDialogClose={this.handleMouseOperationsDialogClose}
          />
        }
        {this.state.aboutDialogIsOpen &&
          <AboutDialog
            onAboutDialogClose={this.handleAboutDialogClose}
          />
        }
      </div>
    );
  }
}

Index.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withRoot(withStyles(styles)(Index));