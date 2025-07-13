import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  FlatList,
  ActivityIndicator, // 用于加载动画
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import axios from 'axios';

// 将毫秒格式化为 MM:SS
const formatTime = (millis) => {
  if (!millis) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 播放器组件

const MusicPlayer = ({ status, onSeek, isSeekingAllowed }) => {
  if (!status || !status.isLoaded) {
    return null;
  }
  return (
    <View style={styles.playerContainer}>
      <Text style={styles.playerTime}>{formatTime(status.positionMillis)}</Text>
      <Slider
        style={styles.playerSlider}
        value={status.positionMillis}
        minimumValue={0}
        maximumValue={status.durationMillis || 1}
        minimumTrackTintColor="#ff9a66"
        maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
        thumbTintColor="#FFFFFF"
        onSlidingComplete={onSeek}
        disabled={!isSeekingAllowed} // 根据prop禁用Slider
      />
      <Text style={styles.playerTime}>{formatTime(status.durationMillis)}</Text>
    </View>
  );
};

const UploadProgress = ({ fileName, onCancel }) => (
  <View style={styles.uploadProgressContainer}>
    <View style={styles.uploadProgressArt}>
      <Ionicons name="musical-note" size={24} color="#fff" />
    </View>
    <View style={styles.uploadProgressInfo}>
      <Text style={styles.uploadProgressFileName} numberOfLines={1}>{fileName}</Text>
      <Text style={styles.uploadProgressStatus}>Ready to create</Text>
    </View>
    <TouchableOpacity style={styles.uploadCancelButton} onPress={onCancel}>
      <Text style={styles.uploadCancelButtonText}>Remove</Text>
    </TouchableOpacity>
  </View>
);

const PROMPT_WORDS = ['minor chords', 'hip hop', 'light music', 'movie soundtrack', '80s synthwave', 'acoustic folk'];
const STYLE_OPTIONS = ['ambient', 'hip-hop', 'classical'];

const MainScreen = () => {
  const [songDescription, setSongDescription] = useState('');
  const [songList, setSongList] = useState([]);
  const [sound, setSound] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null); //存储歌曲url
  const [stagedSong, setStagedSong] = useState(null);
  const [stagedMidi, setStagedMidi] = useState(null); // 存储MIDI文件

  const [isLoading, setIsLoading] = useState(false); // 控制创建按钮的加载状态
  const [playbackStatus, setPlaybackStatus] = useState(null); // 存储当前播放状态

  // 这个状态用于追踪当前播放的音频是否已经准备好，可以被拖动。
  const [isSeekAllowed, setIsSeekAllowed] = useState(false);

  // 使用useRef来防止在回调中拿到旧的状态值
  const isSeeking = useRef(false);

  // Small/Melody 切换按钮状态
  const [creationMode, setCreationMode] = useState('Small'); // 'Small' 或 'Melody'

  // 模型选择下拉框状态
  const [model, setModel] = useState('local'); // 'local' 或 'remote'
  const [isModelPickerVisible, setModelPickerVisible] = useState(false);

  // "sequential" 开关状态
  const [isSequential, setIsSequential] = useState(false);

  const [duration, setDuration] = useState(''); // 秒
  const [songName, setSongName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_OPTIONS[0]);

  // 定位下拉菜单 
  const dropdownButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`Playback Error: ${status.error}`);
        setCurrentlyPlaying(null);
        setPlaybackStatus(null);
      }
      return;
    }
    setPlaybackStatus(status);
    if (status.durationMillis > 0 && !status.isBuffering) {
      if (!isSeekAllowed) {
        setIsSeekAllowed(true); // 允许拖动
      }
    }
    if (status.didJustFinish) {
      sound?.unloadAsync();
      setCurrentlyPlaying(null);
      setPlaybackStatus(null);
      setIsSeekAllowed(false); // 重置
    }
  };

  const handlePlayPauseSong = async (song) => {
    if (!song.uri) return;
    if (sound && currentlyPlaying === song.uri) {
      await sound.unloadAsync();
      setSound(null);
      setCurrentlyPlaying(null);
      setPlaybackStatus(null);
      setIsSeekAllowed(false); // 重置
      return;
    }
    if (sound) {
      await sound.unloadAsync();
    }

    setIsSeekAllowed(false);
    setCurrentlyPlaying(song.uri);
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.uri },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 500 // 每500ms更新一次状态
        }
      );
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    } catch (error) {
      console.error("Error playing sound: ", error);
      setCurrentlyPlaying(null);
      setPlaybackStatus(null);
    }
  };


  const handleSeek = async (value) => {
    // 只有在允许拖动时才执行
    if (sound && isSeekAllowed) {
      // 先暂停播放，防止拖动时音频继续播放导致混乱
      await sound.pauseAsync();
      await sound.setPositionAsync(value);
      // 拖动完成后再继续播放
      await sound.playAsync();
    }
  };

  const handleAddTag = (tag) => {
    setSongDescription(prev => `${prev} ${tag}`.trim());
  };

  const removeStagedSong = () => {
    setStagedSong(null);
  };

  const removeStagedMidi = () => {
    setStagedMidi(null);
  };

  const handleUploadAudio = async () => {
    if (stagedSong) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // asset 是一个 File 对象，它包含了 name, size, type 等所有信息。
        setStagedSong(asset);
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const handleUploadMidi = async () => {
    if (stagedMidi) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // 不限制文件类型
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setStagedMidi(asset);
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  // 打开下拉菜单并测量位置
  const handleDropdownOpen = () => {
    dropdownButtonRef.current.measure((fx, fy, width, height, px, py) => {
      setMenuPosition({
        top: py + height + 5, // 按钮Y坐标 + 按钮高度 + 5px间隙
        left: px,            // 按钮X坐标
      });
      setModelPickerVisible(true);
    });
  };

  const handleCreate = async () => {
    if (songDescription.trim() === '' && !stagedSong && songName.trim() === '') return; // 按钮禁用时，此函数不被调用

    setIsLoading(true); // 开始加载

    // 使用 FormData 来打包数据，这对于文件上传是必须的
    const formData = new FormData();

    // 添加文本数据
    if (songDescription.trim() !== '') {
      formData.append('description', songDescription);
    }
    if (songName.trim() !== '') {
      formData.append('song_name', songName);
    }
    // 添加音频文件数据
    if (stagedSong) {
      // stagedSong.file 是一个 File 对象
      formData.append('audio_file', stagedSong.file);
    }
    // 添加midi文件数据
    if (stagedMidi) {
      formData.append('midi_file', stagedMidi.file);
    }
    formData.append('creation_mode', creationMode);
    formData.append('model', model);
    formData.append('sequential', isSequential); // 将布尔值转换为字符串 'true' 或 'false'
    if (duration) {
      formData.append('duration', duration);
    }
    formData.append('style', selectedStyle);

    try {
      const response = await axios.post('http://localhost:8000/api/create/', formData);

      const newSongFromBackend = response.data;

      // 将后端返回的歌曲添加到列表中
      if (newSongFromBackend && newSongFromBackend.id) {
        setSongList(prevList => [newSongFromBackend, ...prevList]);
      }
      // 操作成功后，清空输入
      setStagedSong(null);
      setStagedMidi(null);
      setSongDescription('');
      setDuration(''); // 创建后清空时长
      setSongName('');
    } catch (error) {
      alert('Failed to create song. Please check the console for details.');
    } finally {
      setIsLoading(false); // 结束加载
    }
  };

  const handleDeleteSong = async (songToDelete) => {
    if (currentlyPlaying === songToDelete.uri) {
      if (sound) await sound.unloadAsync();
      setSound(null);
      setCurrentlyPlaying(null);
      setPlaybackStatus(null);
      setIsSeekAllowed(false);
    }

    setSongList(prevList => prevList.filter(song => song.id !== songToDelete.id));
  };

  // 渲染歌曲列表的组件
  const renderSongItem = ({ item }) => {
    const isPlaying = currentlyPlaying === item.uri;

    return (
      <View style={styles.songItemOuterContainer}>
        <TouchableOpacity
          style={styles.songItemContainer}
          onPress={() => handlePlayPauseSong(item)}
        >
          <View style={styles.songArt}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
          </View>
          <Text style={styles.songName} numberOfLines={2}>{item.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteSong(item)}>
          <Ionicons name="trash-outline" size={22} color="#AEAEAE" />
        </TouchableOpacity>
      </View>
    );
  };

  const isCreateButtonDisabled = (songDescription.trim() === '' && !stagedSong && songName.trim() === '') || isLoading;

  return (
    <View style={styles.container}>
      {/* Left Panel */}
      <View style={styles.leftPanel}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.topControlBar}>
            {/* Small/Melody 切换按钮 */}
            <View style={styles.controlBarSpacer} />

            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, creationMode === 'Small' && styles.toggleButtonActive]}
                onPress={() => setCreationMode('Small')}
              >
                <Text style={styles.toggleButtonText}>Small</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, creationMode === 'Melody' && styles.toggleButtonActive]}
                onPress={() => setCreationMode('Melody')}
              >
                <Text style={styles.toggleButtonText}>Melody</Text>
              </TouchableOpacity>
            </View>
            {/* 右侧的内容容器 */}
            <View style={styles.rightControlContainer}>
              {/* 模型选择下拉框 */}
              <TouchableOpacity ref={dropdownButtonRef} style={styles.dropdownButton} onPress={handleDropdownOpen}>
                <Text style={styles.dropdownButtonText}>{model}</Text>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <Modal
            transparent={true}
            visible={isModelPickerVisible}
            onRequestClose={() => setModelPickerVisible(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModelPickerVisible(false)}>
              <View style={[styles.dropdownMenu, { top: menuPosition.top, left: menuPosition.left }]}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setModel('local'); setModelPickerVisible(false); }}>
                  <Text style={styles.dropdownItemText}>local</Text>
                  {model === 'local' && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setModel('remote'); setModelPickerVisible(false); }}>
                  <Text style={styles.dropdownItemText}>remote</Text>
                  {model === 'remote' && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
          <View style={styles.leftPanelContent}>
            <View style={styles.describeBox}>
              <Text style={styles.describeTitle}>Describe Your Music</Text>
              <TextInput
                style={styles.textInput}
                value={songDescription}
                onChangeText={setSongDescription}
                multiline
                placeholder="You can use the following prompt words to describe your music..."
                placeholderTextColor="#8A8A8A"
              />
              <View style={styles.describeActions}>
                <View style={styles.describeActionsLeft}>
                  <TouchableOpacity style={styles.actionButton} onPress={handleUploadAudio} disabled={!!stagedSong}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Audio</Text>
                  </TouchableOpacity>
                  {/* 当 creationMode 为 'Melody' 时显示 +MIDI 按钮 */}
                  {creationMode === 'Melody' && (
                    <TouchableOpacity style={styles.actionButton} onPress={handleUploadMidi} disabled={!!stagedMidi}>
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>MIDI</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* "sequential" 开关按钮*/}
                <TouchableOpacity style={[styles.sequentialToggle, isSequential && styles.sequentialToggleActive]} onPress={() => setIsSequential(prev => !prev)}>
                  {isSequential && <Ionicons name="checkmark" size={16} color="#000" />}
                  <Text style={[styles.sequentialToggleText, isSequential && styles.sequentialToggleTextActive]}>sequential</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* "Time" 输入框*/}
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputLabel}>Time</Text>
              <TextInput
                style={styles.timeInput}
                value={duration}
                onChangeText={setDuration}
                placeholder="Enter duration in seconds"
                placeholderTextColor="#8A8A8A"
                keyboardType="numeric"
              />
            </View>
            {/* 新增: Song Name 输入框*/}
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputLabel}>Song Name</Text>
              <TextInput style={styles.timeInput} value={songName} onChangeText={setSongName} placeholder="Enter a custom song name" placeholderTextColor="#8A8A8A" />
            </View>
            {/* 新增: Style 单选框*/}
            <View style={styles.styleSelectorContainer}>
              <Text style={styles.styleSelectorLabel}>Style</Text>
              <View style={styles.styleOptionsContainer}>
                {STYLE_OPTIONS.map(style => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.styleOptionButton,
                      selectedStyle === style && styles.styleOptionButtonActive
                    ]}
                    onPress={() => setSelectedStyle(style)}
                  >
                    <Text style={[
                      styles.styleOptionButtonText,
                      selectedStyle === style && styles.styleOptionButtonTextActive
                    ]}>{style}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {stagedSong && (
              <UploadProgress
                fileName={stagedSong.name}
                onCancel={removeStagedSong}
              />
            )}

            {/* 显示已暂存的MIDI文件 */}
            {stagedMidi && (
              <UploadProgress
                fileName={stagedMidi.name}
                onCancel={removeStagedMidi}
              />
            )}

            <View style={styles.inspirationBox}>
              <Text style={styles.describeTitle}>Prompt Words</Text>
              <View style={styles.tagsContainer}>
                {PROMPT_WORDS.map(tag => (
                  <TouchableOpacity key={tag} style={styles.tag} onPress={() => handleAddTag(tag)}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.createButtonWrapper}
          onPress={handleCreate}
          disabled={isCreateButtonDisabled}
        >
          <LinearGradient
            colors={isCreateButtonDisabled ? ['#555', '#444'] : ['#ffb347', '#ff4f81', '#a73779']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.createButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="musical-notes" size={20} color="#FFF" />
            )}
            <Text style={styles.createButtonText}>
              {isLoading ? 'Creating Music…Please Wait' : 'Create'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Right Panel */}
      <View style={styles.rightPanel}>
        <View style={styles.rightPanelHeader}>
          <Text style={styles.rightPanelTitle}>My Music List ({songList.length})</Text>
        </View>
        <View style={styles.songListContainer}>
          {songList.length > 0 ? (
            <FlatList
              data={songList}
              renderItem={renderSongItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingTop: 20 }}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>Your created music will appear here.</Text>
            </View>
          )}
        </View>
        {playbackStatus && (
          <MusicPlayer status={playbackStatus} onSeek={handleSeek} isSeekingAllowed={isSeekAllowed} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, flexDirection: 'row', backgroundColor: '#121212', color: '#fff',
  },
  leftPanel: {
    width: 450, backgroundColor: '#1C1C1E', borderRightWidth: 1, borderRightColor: '#333', flexShrink: 0,
  },
  leftPanelContent: {
    paddingHorizontal: 25,
    paddingBottom: 25,
  },
  describeBox: {
    backgroundColor: '#2C2C2E', borderRadius: 12, padding: 15,
  },
  describeTitle: {
    color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 10,
  },
  textInput: {
    color: '#fff', fontSize: 16, minHeight: 80, 
    textAlignVertical: 'top', padding: 5, lineHeight: 22,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 10,
  },
  actionButtonText: {
    color: '#fff', marginLeft: 5, fontWeight: '500',
  },
  inspirationBox: {
    marginTop: 20,
  },
  tagsContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#444', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8,
  },
  tagText: {
    color: '#fff', marginLeft: 4,
  },
  createButtonWrapper: {
    padding: 20, paddingTop: 10, backgroundColor: '#1C1C1E', borderTopWidth: 1, borderTopColor: '#333'
  },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 12, opacity: 1
  },
  createButtonText: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 10,
  },
  uploadProgressContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 12, padding: 12,
    marginTop: 20
  },
  uploadProgressArt: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  uploadProgressInfo: { flex: 1 },
  uploadProgressFileName: {
    color: '#fff', fontWeight: '600', fontSize: 15,
  },
  uploadProgressStatus: {
    color: '#90EE90', fontSize: 12,
  },
  uploadCancelButton: {
    backgroundColor: '#444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginLeft: 12,
  },
  uploadCancelButtonText: {
    color: '#fff', fontWeight: '500',
  },
  rightPanel: { flex: 1, paddingHorizontal: 30, paddingBottom: 20, paddingTop: 30, display: 'flex', flexDirection: 'column' },
  rightPanelHeader: { flexShrink: 0 },
  rightPanelTitle: {
    color: '#fff', fontSize: 28, fontWeight: 'bold',
  },
  songListContainer: { flex: 1, minHeight: 0 }, // 确保列表可以滚动
  songItemOuterContainer: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#2C2C2E', borderRadius: 10,
  },
  songItemContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 12, flex: 1,
  },
  songArt: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(255, 129, 151, 0.5)',
    justifyContent: 'center', alignItems: 'center', marginRight: 15, flexShrink: 0,
  },
  songName: {
    color: '#fff', fontSize: 16, flex: 1,
  },
  deleteButton: {
    padding: 15,
  },
  emptyStateContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff', fontSize: 18, marginBottom: 10
  },

  // 播放器样式
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: '#2C2C2E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderRadius: 12,
    marginTop: 20,
    flexShrink: 0,
  },
  playerSlider: {
    flex: 1,
    marginHorizontal: 10,
  },
  playerTime: {
    color: '#AEAEAE',
    fontSize: 12,
    width: 45, // 固定宽度防止时间变化时布局跳动
    textAlign: 'center',
  },
  // 顶部控制栏容器
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between', // 居中放置切换按钮
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 15,
  },
  controlBarSpacer: {
    flex: 1, // 左侧占位符
  },
  rightControlContainer: {
    flex: 1, // 右侧容器
    alignItems: 'flex-end', // 将内部元素推到最右边
  },
  // Small/Melody 切换按钮样式
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 3,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#444',
  },
  toggleButtonText: {
    color: '#E0E0E0',
    fontWeight: '600',
    fontSize: 14,
  },

  // 模型选择下拉框样式
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#383838',
    borderRadius: 8,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    width: 180,
    zIndex: 1000, // 确保菜单在最顶层
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  // 修改后的 actions 容器样式
  describeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 10,
  },
  describeActionsLeft: {
    flexDirection: 'row',
  },

  // "sequential" 开关按钮样式
  sequentialToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6
  },
  sequentialToggleActive: {
    backgroundColor: '#FFFFFF',
  },
  sequentialToggleText: {
    color: '#fff',
    fontWeight: '500',
  },
  sequentialToggleTextActive: {
    color: '#000',
  },

  // "Time" 输入框样式
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginTop: 15,
    height: 50,
  },
  timeInputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 15,
    width: 80, // 增加宽度以容纳 "Song Name"
  },
  timeInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  // Style 单选框样式
  styleSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginTop: 15,
    minHeight: 50,
    paddingVertical: 5,
  },
  styleSelectorLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 15,
    width: 80, // 与 timeInputLabel 保持一致
  },
  styleOptionsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap', // 允许换行
    alignItems: 'center',
  },
  styleOptionButton: {
    backgroundColor: '#444',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginVertical: 4,
  },
  styleOptionButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  styleOptionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  styleOptionButtonTextActive: {
    color: '#000',
  },
});

export default MainScreen;
