// 인증 페이지 JavaScript
//데이터 검증은 변수를 사용하는 것이 아니고 함수의 return 값을 사용함

class AuthManager {
    emilNM =0;
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.verificationTimer = null;
        this.verificationTimeLeft = 300; // 5분
        this.isUsernameChecked = false;
        this.isEmailVerified = false;
        this.selectedProfile = 'profile1';
        this.init(); //함수 호출, this.init는 필드값 할당
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('login')) return 'login';
        if (path.includes('signup')) return 'signup';
        return 'unknown';
    }

    init() {
        console.log(`🔐 ${this.currentPage} 페이지 초기화`);

        if (this.currentPage === 'login') {
            this.initLogin();
        } else if (this.currentPage === 'signup') {
            this.initSignup();
        }

        this.setupSocialLogin();
    }

    initLogin() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });

        // 실시간 유효성 검사 - 아이디/비번으로 로그인(이메일 아님)
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');


        usernameInput?.addEventListener('blur', () => this.validateUsername(usernameInput.value));
        passwordInput?.addEventListener('blur', () => this.validatePassword(passwordInput.value));

    }

    initSignup() {
        const form = document.getElementById('signup-form');
        if (!form) return;

        // 프로필 이미지 선택 초기화
        this.initProfileSelection();

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup(e);
        });

        // 실시간 유효성 검사
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const nickNmInput = document.getElementById('nickNm');

        // 아이디 중복확인 버튼
        const usernameCheckBtn = document.getElementById('username-check-btn');
        usernameCheckBtn?.addEventListener('click', () => this.checkUsername());

        // 이메일 인증번호 발송 버튼
        const emailVerifyBtn = document.getElementById('email-verify-btn');
        emailVerifyBtn?.addEventListener('click', () => this.sendVerificationCode());

        // 인증번호 확인 버튼
        const verifyCheckBtn = document.getElementById('verify-check-btn');
        verifyCheckBtn?.addEventListener('click', () => this.verifyCode());

        // 재발송 버튼
        const resendBtn = document.getElementById('resend-btn');
        resendBtn?.addEventListener('click', () => this.resendVerificationCode());

        // 빈 화면 클릭 시 필수사항 확인
        usernameInput?.addEventListener('blur', () => this.validateUsername(usernameInput.value));
        emailInput?.addEventListener('blur', () => this.validateEmail(emailInput.value));
        passwordInput?.addEventListener('input', () => this.validatePasswordStrength(passwordInput.value));
        confirmPasswordInput?.addEventListener('blur', () => this.validatePasswordMatch());
        nickNmInput?.addEventListener('blur', () => this.validateNickNm(nickNmInput.value));
    }
    /*이미지 선택*/
    initProfileSelection() {
        const profileItems = document.querySelectorAll('.profile-image-item');
        const selectedProfileInput = document.getElementById('selected-profile');

        // 첫 번째 프로필 기본 선택
        if (profileItems.length > 0) {
            profileItems[0].classList.add('selected');
        }

        profileItems.forEach(item => {
            item.addEventListener('click', () => {
                // 모든 프로필에서 선택 해제
                profileItems.forEach(p => p.classList.remove('selected'));

                // 선택된 프로필 표시
                item.classList.add('selected');

                // 값 저장
                this.selectedProfile = item.dataset.profile;
                selectedProfileInput.value = this.selectedProfile;
            });
        });
    }

    //--btn에 이벤트 리스터 추가함
    async checkUsername() {
        const username = document.getElementById('username').value;
        const usernameError = document.getElementById('username-error');
        const checkBtn = document.getElementById('username-check-btn');

        if (!this.validateUsername(username)) { //오류가 발생하면 UI하고 끝
            return;
        }

        this.setLoading(checkBtn, true);

        try {
            // 아이디 중복 검사 API 시뮬레이션
            const isDuplicate = await this.simulateUsernameCheck(username);

            if (isDuplicate) {
                this.showFieldError(usernameError, '이미 사용 중인 아이디입니다.');
                this.isUsernameChecked = false;
            } else {
                this.showFieldSuccess(usernameError, '사용 가능한 아이디입니다.');
                this.isUsernameChecked = true;
                checkBtn.classList.add('checked');
                checkBtn.textContent = '확인완료';
                checkBtn.disabled = true;
            }
        } catch (error) {
            this.showFieldError(usernameError, '중복 확인 중 오류가 발생했습니다.');
            this.isUsernameChecked = false;
        } finally {
            this.setLoading(checkBtn, false);
        }
    }

    async sendVerificationCode() {
        const email = document.getElementById('email').value;
        const emailError = document.getElementById('email-error');
        const sendBtn = document.getElementById('email-verify-btn');

        if (!this.validateEmail(email)) {
            return;
        }

        this.setLoading(sendBtn, true);

        try {
            // 인증번호 get, 전역변수로 지정,,,
            this.emilNM = await this.simulateEmailVerification(email);

            this.showFieldSuccess(emailError, '인증번호가 발송되었습니다.');

            // 인증번호 입력 필드 표시
            this.showVerificationGroup();

            // 버튼 상태 변경
            sendBtn.classList.add('sent');
            sendBtn.textContent = '발송완료';
            sendBtn.disabled = true;

            // 타이머 시작
            this.startVerificationTimer();

        } catch (error) {
            this.showFieldError(emailError, '인증번호 발송에 실패했습니다.');
        } finally {
            this.setLoading(sendBtn, false);
        }
    }

    async verifyCode() {
        const code = document.getElementById('verification-code').value;
        const verificationError = document.getElementById('verification-error');
        const verifyBtn = document.getElementById('verify-check-btn');

        if (!code) {
            this.showFieldError(verificationError, '인증번호를 입력해주세요.');
            return;
        }

        this.setLoading(verifyBtn, true);

        try {
            // 인증번호 확인 API 시뮬레이션
            const isValid = await this.simulateCodeVerification(code,this.emilNM);

            if (isValid) {
                this.showFieldSuccess(verificationError, '이메일이 인증되었습니다.');
                this.isEmailVerified = true;
                verifyBtn.classList.add('verified');
                verifyBtn.textContent = '인증완료';
                verifyBtn.disabled = true;

                // 타이머 중지
                this.stopVerificationTimer();

                // 재발송 버튼 숨기기
                document.getElementById('resend-btn').style.display = 'none';

            } else {
                this.showFieldError(verificationError, '인증번호가 올바르지 않습니다.');
            }
        } catch (error) {
        console.log(error);
            this.showFieldError(verificationError, '인증 확인 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(verifyBtn, false);
        }
    }

    async resendVerificationCode() {
        const email = document.getElementById('email').value;
        const resendBtn = document.getElementById('resend-btn');

        this.setLoading(resendBtn, true);

        try {
            await this.simulateEmailVerification(email);
            this.showMessage('인증번호가 재발송되었습니다.', 'success');

            // 타이머 리셋
            this.verificationTimeLeft = 300;
            this.startVerificationTimer();

        } catch (error) {
            this.showMessage('재발송에 실패했습니다.', 'error');
        } finally {
            this.setLoading(resendBtn, false);
        }
    }

    showVerificationGroup() {
        const verificationGroup = document.getElementById('verification-group');
        verificationGroup.style.display = 'block';
    }

    startVerificationTimer() {
        const timerElement = document.getElementById('verification-timer');
        const resendBtn = document.getElementById('resend-btn');

        resendBtn.disabled = true;

        this.verificationTimer = setInterval(() => {
            this.verificationTimeLeft--;

            const minutes = Math.floor(this.verificationTimeLeft / 60);
            const seconds = this.verificationTimeLeft % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (this.verificationTimeLeft <= 0) {
                this.stopVerificationTimer();
                timerElement.textContent = '시간만료';
                resendBtn.disabled = false;
            }
        }, 1000);
    }

    stopVerificationTimer() {
        if (this.verificationTimer) {
            clearInterval(this.verificationTimer);
            this.verificationTimer = null;
        }
    }

    //로그인 submit 클릭시 유효성 검사
    async handleLogin(e) {
        const id = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // 유효성 검사
        if (!this.validateUsername(id) || !this.validatePassword(password)) {
            return;
        }

        const submitBtn = document.querySelector('.auth-btn');
        this.setLoading(submitBtn, true);
        e.target.submit();

    }

    //submit 클릭시 조건 다 확인하기 위함 부모 함수
    async handleSignup(e) {
        //input한 모든 value를 객체로 받음
        const formData = this.getSignupFormData();

        // 유효성 검사
        if (!this.validateSignupForm(formData)) {
            return;
        }

        const submitBtn = document.querySelector('.auth-btn');
        this.setLoading(submitBtn, true);

        e.target.submit();
    }

    getSignupFormData() {
        return {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirm-password').value,
            nickNm: document.getElementById('nickNm').value,
            terms: document.getElementById('terms').checked,
            marketing: document.getElementById('marketing').checked,
            profile: this.selectedProfile,
            verificationCode: document.getElementById('verification-code')?.value
        };
    }

    validateSignupForm(data) {
        let isValid = true;

        if (!this.validateUsername(data.username)) isValid = false;
        if (!this.validateEmail(data.email)) isValid = false;
        if (!this.validatePassword(data.password)) isValid = false;
        if (!this.validatePasswordMatch()) isValid = false;
        if (!this.validateTerms(data.terms)) isValid = false;
        if (!this.validateTerms(data.terms)) isValid = false;
        if (!this.validateNickNm(data.nickNm)) isValid = false;

        // 중복확인 및 이메일 인증 체크
        if (!this.isUsernameChecked) {
            this.showMessage('아이디 중복확인을 해주세요.', 'error');
            isValid = false;
        }

        if (!this.isEmailVerified) {
            this.showMessage('이메일 인증을 완료해주세요.', 'error');
            isValid = false;
        }

        return isValid;
    }
    //--끝


    //--조건 검사
    validateUsername(username) {
        const usernameError = document.getElementById('username-error');
        const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;

        if (!username) {
            this.showFieldError(usernameError, '아이디를 입력해주세요.');
            return false;
        }

        if (!usernameRegex.test(username)) {
            this.showFieldError(usernameError, '아이디는 4-20자의 영문, 숫자, 언더스코어만 사용 가능합니다.');
            return false;
        }

        this.clearFieldError(usernameError); //해당 오류 DIV가 없으면 안보이게 하려고
        return true;
    }

    validateNickNm(nickNm) {
            const nickError = document.getElementById('nickNm-error');
            const nickRegex =/^[A-Za-z\uAC00-\uD7A3]{4,20}$/u;

            if (!nickNm) {
                this.showFieldError(nickError, '닉네임을 입력해주세요.');
                return false;
            }

            if (!nickRegex.test(nickNm)) {
                this.showFieldError(nickError, '닉네임은 4-20자의 영문, 한글만 사용 가능합니다.');
                return false;
            }

            this.clearFieldError(nickError); //해당 오류 DIV가 없으면 안보이게 하려고
            return true;
        }

    validateEmail(email) {
        const emailError = document.getElementById('email-error');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            this.showFieldError(emailError, '이메일을 입력해주세요.');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showFieldError(emailError, '올바른 이메일 형식을 입력해주세요.');
            return false;
        }

        this.clearFieldError(emailError);
        return true;
    }

    validatePassword(password) {
        const passwordError = document.getElementById('password-error');

        if (!password) {
            this.showFieldError(passwordError, '비밀번호를 입력해주세요.');
            return false;
        }

        if (password.length < 8) {
            this.showFieldError(passwordError, '비밀번호는 8자 이상이어야 합니다.');
            return false;
        }

        this.clearFieldError(passwordError);
        return true;
    }

    validatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        if (!strengthBar || !strengthText) return;

        let strength = 0;
        let strengthLabel = '';

        if (password.length >= 8) strength += 25;
        if (/[a-z]/.test(password)) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;

        if (strength <= 25) {
            strengthLabel = '약함';
            strengthBar.style.background = '#ef4444';
        } else if (strength <= 50) {
            strengthLabel = '보통';
            strengthBar.style.background = '#f59e0b';
        } else if (strength <= 75) {
            strengthLabel = '강함';
            strengthBar.style.background = '#10b981';
        } else {
            strengthLabel = '매우 강함';
            strengthBar.style.background = '#059669';
        }

        strengthBar.style.width = strength + '%';
        strengthText.textContent = `비밀번호 강도: ${strengthLabel}`;
    }

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const confirmError = document.getElementById('confirm-password-error');

        if (!confirmPassword) {
            this.showFieldError(confirmError, '비밀번호 확인을 입력해주세요.');
            return false;
        }

        if (password !== confirmPassword) {
            this.showFieldError(confirmError, '비밀번호가 일치하지 않습니다.');
            return false;
        }

        this.clearFieldError(confirmError);
        return true;
    }

    validateTerms(terms) {
        const termsError = document.getElementById('terms-error');

        if (!terms) {
            this.showFieldError(termsError, '이용약관에 동의해주세요.');
            return false;
        }

        this.clearFieldError(termsError);
        return true;
    }
    //--끝

    //--에러 div 위치 데이터 삽입
    //해당 DIV에 에러메세지 삽입
    showFieldError(errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.className = 'form-error';
        }
    }

    showFieldSuccess(errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.className = 'form-success';
        }
    }

    //에러 DIV CLEAR
    clearFieldError(errorElement) {
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.className = 'form-error';
        }
    }
    //--끝


    //--rest api
    // API 시뮬레이션 함수들(아이디 중복)
    async simulateUsernameCheck(username) {
        const result = await fetch('duplication?username='+username);
        const data = await result.json();
        return data.result;
    }

    //이메일 전송 api
    async simulateEmailVerification(email) {
        const result = await fetch(`mailsend/${email}`);
        const data = await result.text();
        return data;
    }

    async simulateCodeVerification(code,emilNM) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(code === emilNM);
            }, 1000);
        });
    }

    //--끝

    setupSocialLogin() {
        const googleBtn = document.querySelector('.google-btn');
        const naverBtn = document.querySelector('.naver-btn');

        googleBtn?.addEventListener('click', () => {
            this.handleSocialLogin('google');
        });

        naverBtn?.addEventListener('click', () => {
            this.handleSocialLogin('naver');
        });
    }

    handleSocialLogin(provider) {
        const providerNames = {
            google: 'Google',
            naver: '네이버'
        };
        this.showMessage(`${providerNames[provider]} 로그인 기능은 개발 중입니다.`, 'info');
    }

     //로딩 ui 에 적용하기 위해 css적용
    setLoading(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showMessage(message, type = 'info') {
        // 기존 메시지 제거
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 새 메시지 생성
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // 폼 위에 메시지 삽입
        const form = document.querySelector('form');
        if (form) {
            form.parentNode.insertBefore(messageDiv, form);
        }

        // 5초 후 자동 제거
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// 유틸리티 함수들
function checkAuthStatus() {
    const userData = localStorage.getItem('opuscine_user') || sessionStorage.getItem('opuscine_user');
    return userData ? JSON.parse(userData) : null;
}

function logout() {
    localStorage.removeItem('opuscine_user');
    sessionStorage.removeItem('opuscine_user');
    window.location.href = '/login';
}

// 전역으로 내보내기
window.AuthManager = AuthManager;
window.checkAuthStatus = checkAuthStatus;
window.logout = logout; 