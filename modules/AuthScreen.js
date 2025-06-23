import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
    ScrollView,
    Dimensions,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from '../axiosConfig';

const AuthScreen = ({ navigation }) => {
    const [showStaticCursor, setShowStaticCursor] = useState(true);

    // 流式文本内容
    const originalMainHeadingText = "Alleviating Anxiety\nand\nEnhancing Hospital Experiences!";
    const [displayedMainHeading, setDisplayedMainHeading] = useState('');
    const [charIndex, setCharIndex] = useState(0);
    const [isTypingFinished, setIsTypingFinished] = useState(false);
    const typingSpeed = 100; // 打字速度 (ms)
    const cursorBlinkSpeed = 530; // 光标闪烁速度 (ms)
    const RESTART_TYPING_DELAY = 1500; // 重新开始打字前的延迟 (ms)

    // Modal 状态
    const [isSignInModalVisible, setSignInModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // 在组件加载时获取 CSRF token
    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                await axios.get('/api/csrf/');
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
            }
        };
        fetchCsrfToken();
    }, []);

    // 流式文本打字效果
    useEffect(() => {
        if (!isTypingFinished && charIndex < originalMainHeadingText.length) {
            const typingTimeout = setTimeout(() => {
                setDisplayedMainHeading((prev) => prev + originalMainHeadingText[charIndex]);
                setCharIndex((prev) => prev + 1);
            }, typingSpeed);
            return () => clearTimeout(typingTimeout);
        } else if (charIndex === originalMainHeadingText.length && !isTypingFinished) {
            setIsTypingFinished(true); // 标记打字完成
        }
    }, [charIndex, originalMainHeadingText, isTypingFinished]);

    // 循环流式文本效果
    useEffect(() => {
        let restartTimeout;
        if (isTypingFinished) {
            restartTimeout = setTimeout(() => {
                setDisplayedMainHeading('');
                setCharIndex(0);
                setIsTypingFinished(false); // 允许重新开始打字
            }, RESTART_TYPING_DELAY);
        }
        return () => clearTimeout(restartTimeout);
    }, [isTypingFinished]);

    // 主标题动态光标闪烁效果
    useEffect(() => {
        const cursorInterval = setInterval(() => {
            setShowStaticCursor((prev) => !prev);
        }, cursorBlinkSpeed);
        return () => clearInterval(cursorInterval);
    }, []);

    const openSignInModal = () => {
        setEmail('');
        setPassword('');
        setSignInModalVisible(true);
    };

    const closeModal = () => {
        setSignInModalVisible(false);
    };

    const handleSignIn = async () => {
        if (email.trim() === '' || password.trim() === '') return;
        try {
            const response = await axios.post('/api/signin/', {
                email: email,
                password: password,
            });
            // console.log('Backend response:', response.data);
            if (response.data.status === 'ok') {
                closeModal();
                navigation.navigate('Create Your Music');
            } else {
                // 处理登录失败的逻辑
                alert(response.data.message || 'Sign in failed');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        }
    };

    const handleSignUp = () => {
        if (email.trim() === '' || password.trim() === '') return;
        closeModal();
        navigation.navigate('Main');
    };

    const screenHeight = Dimensions.get('window').height;

    const renderAuthModalContent = (isSigningUp) => {
        const isContinueButtonDisabled = email.trim() === '' || password.trim() === '';

        return (
            <View style={modalStyles.centeredView}>
                <View style={modalStyles.modalView}>
                    <TouchableOpacity style={modalStyles.closeButton} onPress={closeModal}>
                        <Ionicons name="close" size={28} color="#AEAEAE" />
                    </TouchableOpacity>

                    <Text style={modalStyles.modalLogo}>Music Generation System</Text>
                    <Text style={modalStyles.modalSubtitle}>
                        {isSigningUp
                            ? 'Welcome! Please fill in the details to get started.'
                            : 'Welcome! Please sign in to continue'}
                    </Text>

                    <TextInput
                        style={modalStyles.input}
                        placeholder="Email address"
                        placeholderTextColor="#8A8A8A"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={modalStyles.input}
                        placeholder="Password"
                        placeholderTextColor="#8A8A8A"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[
                            modalStyles.continueButton,
                            isContinueButtonDisabled && modalStyles.continueButtonDisabled,
                        ]}
                        onPress={isSigningUp ? handleSignUp : handleSignIn}
                        disabled={isContinueButtonDisabled}
                    >
                        <Text style={[
                            modalStyles.continueButtonText,
                            isContinueButtonDisabled && modalStyles.continueButtonTextDisabled
                        ]}>Continue</Text>
                        <Ionicons
                            name="play-forward"
                            size={16}
                            color={isContinueButtonDisabled ? "#666666" : "#000000"}
                            style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    <Text style={modalStyles.legalText}>
                        If you don't have an account, you will be automatically registered after signing in.
                    </Text>
                </View>
            </View>
        );
    }


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <LinearGradient
                colors={['#3a2227', '#2c1d27', '#1a101a']}
                style={styles.fullScreenGradient}
            >
                <StatusBar barStyle="light-content" />
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.container, { minHeight: screenHeight }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.logo}>AI Music Generation System</Text>
                            <View style={styles.authButtons}>
                                <TouchableOpacity style={styles.signInButton} onPress={openSignInModal}>
                                    <Text style={styles.signInButtonText}>Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Main Content */}
                        <View style={styles.mainContent}>
                            <View style={styles.headingContainer}>
                                <Text style={styles.mainHeading}>
                                    {displayedMainHeading}
                                    {(!isTypingFinished || (isTypingFinished && showStaticCursor)) && (
                                        <Text style={styles.cursor}>|</Text>
                                    )}
                                </Text>
                            </View>

                            <Text style={styles.subHeading}>
                                Start with a simple Sign In
                                {'\n'}
                                and you can create a soothing music
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Sign In Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isSignInModalVisible}
                    onRequestClose={closeModal}
                >
                    {renderAuthModalContent(false)}
                </Modal>

            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    fullScreenGradient: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 20 : StatusBar.currentHeight || 20,
        paddingBottom: 40,
        justifyContent: 'space-between',
    },
    header: {
        width: '100%',
        maxWidth: 1200,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        marginBottom: '5%',
    },
    logo: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : 'sans-serif',
    },
    authButtons: {
        flexDirection: 'row',
    },
    signInButton: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        marginRight: 10,
    },
    signInButtonText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '500',
    },
    signUpButton: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
    },
    signUpButtonText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '500',
    },
    mainContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 700,
        flex: 1,
    },
    headingContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: 25,
        minHeight: Platform.OS === 'web' ? 128 : 104,
    },
    mainHeading: {
        color: '#FFFFFF',
        fontSize: Platform.OS === 'web' ? 52 : 42,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: Platform.OS === 'web' ? 64 : 52,
        fontFamily: Platform.OS === 'web' ? 'Georgia, Times, serif' : 'serif',
    },
    cursor: {
        color: '#FFFFFF',
        fontSize: Platform.OS === 'web' ? 52 : 42,
        lineHeight: Platform.OS === 'web' ? 64 : 52,
        fontFamily: Platform.OS === 'web' ? 'Georgia, Times, serif' : 'serif',
        marginLeft: Platform.OS === 'web' ? 1 : 0,
    },
    subHeading: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 35,
        maxWidth: 500,
        fontFamily: Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : 'sans-serif',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 30,
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        width: '100%',
        maxWidth: 600,
    },
    inputIcon: {
        marginHorizontal: 8,
    },
    promptInput: { // 从styles.input 到 styles.promptInput 的改变
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        paddingVertical: Platform.OS === 'web' ? 10 : 5,
        fontFamily: Platform.OS === 'web' ? 'Helvetica, Arial, sans-serif' : 'sans-serif',
        ...(Platform.OS === 'web' && { outlineStyle: 'none' }), // Remove web outline
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginLeft: 10,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    musicianButton: {
        marginTop: '10%',
        paddingVertical: 10,
        paddingHorizontal: 25,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 25,
    },
    musicianButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
    },
});

const modalStyles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalView: {
        width: Platform.OS === 'web' ? 420 : '90%',
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        paddingHorizontal: Platform.OS === 'web' ? 35 : 25,
        paddingVertical: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 20 : 15,
        right: Platform.OS === 'web' ? 20 : 15,
        padding: 5,
        zIndex: 1,
    },
    modalLogo: {
        fontSize: 23,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 20,
        letterSpacing: 1.5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#AEAEAE',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
        maxWidth: '90%',
    },
    input: { // modal inputs 样式
        width: '100%',
        backgroundColor: '#2C2C2E',
        color: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        fontSize: 16,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#4A4A4C',
        ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF', // 启用状态
        paddingVertical: 14,
        borderRadius: 25,
        width: '100%',
        marginBottom: 25,
        minHeight: 48,
    },
    continueButtonDisabled: {
        backgroundColor: '#E0E0E0', // Light grey background for disabled button
    },
    continueButtonText: {
        color: '#000000', // Black text for enabled button
        fontSize: 16,
        fontWeight: '600',
    },
    continueButtonTextDisabled: {
        color: '#666666', // Darker grey text for disabled button
    },
    legalText: {
        fontSize: 11,
        color: '#8A8A8A',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 16,
        paddingHorizontal: 10,
    },
    switchAuthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchAuthText: {
        color: '#AEAEAE',
        fontSize: 14,
    },
    switchAuthLink: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 5,
    },
});

export default AuthScreen;
