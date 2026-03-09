import { t } from "../../services/i18n.js";

const STORAGE_KEY = "profilePhoto";

export function initPhotoProfile() {
  const photoContainer = document.getElementById("photoContainer");
  const photoInput = document.getElementById("photoInput");
  const cameraIcon = document.querySelector(".camera-icon");
  const sidebarAvatar = document.querySelector(".user-avatar");

  if (!photoContainer || !photoInput || !cameraIcon) return;

  const actionBackdrop = document.createElement("div");
  actionBackdrop.className = "photo-action-backdrop";

  const actionModal = document.createElement("div");
  actionModal.className = "photo-action-modal";
  actionModal.innerHTML = `
    <p class="photo-action-title"></p>
    <div class="photo-action-buttons">
      <button type="button" class="photo-action-btn edit-photo-btn"></button>
      <button type="button" class="photo-action-btn danger delete-photo-btn"></button>
      <button type="button" class="photo-action-btn close-photo-btn"></button>
    </div>
  `;

  document.body.appendChild(actionBackdrop);
  document.body.appendChild(actionModal);

  const editPhotoBtn = actionModal.querySelector(".edit-photo-btn");
  const deletePhotoBtn = actionModal.querySelector(".delete-photo-btn");
  const closePhotoBtn = actionModal.querySelector(".close-photo-btn");
  const actionTitle = actionModal.querySelector(".photo-action-title");

  function syncActionTexts() {
    if (actionTitle) actionTitle.textContent = t("photo.options");
    if (editPhotoBtn) editPhotoBtn.textContent = t("photo.edit");
    if (deletePhotoBtn) deletePhotoBtn.textContent = t("photo.delete");
    if (closePhotoBtn) closePhotoBtn.textContent = t("photo.cancel");
  }
  syncActionTexts();

  function pulseUpdate(target, className) {
    if (!target) return;
    target.classList.remove(className);
    // Force restart animation
    void target.offsetWidth;
    target.classList.add(className);
    setTimeout(() => target.classList.remove(className), 520);
  }

  function syncSidebarAvatar(imageBase64) {
    if (!sidebarAvatar) return;
    sidebarAvatar.style.backgroundImage = imageBase64 ? `url(${imageBase64})` : "";
    sidebarAvatar.classList.toggle("has-image", Boolean(imageBase64));
    if (imageBase64) {
      pulseUpdate(sidebarAvatar, "is-updated");
    }
  }

  function closeActionModal() {
    actionBackdrop.classList.remove("active");
    actionModal.classList.remove("active");
  }

  function openActionModal() {
    actionBackdrop.classList.add("active");
    actionModal.classList.add("active");
  }

  function clearPhoto() {
    photoContainer.style.backgroundImage = "";
    photoContainer.classList.remove("has-image");
    cameraIcon.style.display = "block";
    syncSidebarAvatar(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  // Cargar imagen guardada
  const savedPhoto = localStorage.getItem(STORAGE_KEY);

  if (savedPhoto) {
    photoContainer.style.backgroundImage = `url(${savedPhoto})`;
    photoContainer.classList.add("has-image");
    cameraIcon.style.display = "none";
    syncSidebarAvatar(savedPhoto);
  } else {
    syncSidebarAvatar(null);
  }

  // Click en foto abre mini modal de acciones
  photoContainer.addEventListener("click", openActionModal);

  // Subir imagen
  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = function (event) {
        const imageBase64 = event.target.result;

        photoContainer.style.backgroundImage = `url(${imageBase64})`;
        photoContainer.classList.add("has-image");
        cameraIcon.style.display = "none";
        pulseUpdate(photoContainer, "is-updated");
        syncSidebarAvatar(imageBase64);

        localStorage.setItem(STORAGE_KEY, imageBase64);
      };

      reader.readAsDataURL(file);
    }

    photoInput.value = "";
  });

  editPhotoBtn?.addEventListener("click", () => {
    closeActionModal();
    photoInput.click();
  });

  deletePhotoBtn?.addEventListener("click", () => {
    clearPhoto();
    closeActionModal();
  });

  closePhotoBtn?.addEventListener("click", closeActionModal);
  actionBackdrop.addEventListener("click", closeActionModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeActionModal();
    }
  });

  document.addEventListener("i18n:change", syncActionTexts);
}
