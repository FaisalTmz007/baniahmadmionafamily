"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FamilyTree from "@balkangraph/familytree.js";
import supabase from "@/libs/db";
import Dialog from "@/components/dialog";
import { ITree, NodeData } from "@/types/tree";
import { useRouter } from "next/navigation";
import { convertXmlToJson } from "@/libs/convertJson";
import ImageCropModal from "./ImageCropModal";

// interface FamilyTreeComponentProps {
//   dataTree: ITree;
// }

interface FamilyTreeComponentProps {
  dataTree: ITree;
  onUpdate: () => void | Promise<void>; // tambahkan Promise<void> untuk async handling
}

// Store untuk menyimpan foto yang akan diupload
let pendingImageUploads: { [nodeId: string]: { file: File; oldPhotoUrl?: string } } = {};

FamilyTree.miniMap.selectorBackgroundColor = "#2b2b2b";
FamilyTree.SEARCH_PLACEHOLDER = "CARI";
FamilyTree.templates.base.defs = `<g transform="matrix(0.05,0,0,0.05,-12,-9)" id="heart">
        <path fill="#fc71e5ff" d="M438.482,58.61c-24.7-26.549-59.311-41.655-95.573-41.711c-36.291,0.042-70.938,15.14-95.676,41.694l-8.431,8.909  l-8.431-8.909C181.284,5.762,98.663,2.728,45.832,51.815c-2.341,2.176-4.602,4.436-6.778,6.778 c-52.072,56.166-52.072,142.968,0,199.134l187.358,197.581c6.482,6.843,17.284,7.136,24.127,0.654 c0.224-0.212,0.442-0.43,0.654-0.654l187.29-197.581C490.551,201.567,490.551,114.77,438.482,58.61z"/>
        </g>
        <g transform="matrix(1,0,0,1,0,0)" id="dot"></g>
            <g id="base_node_menu" style="cursor:pointer;">
                <rect x="0" y="0" fill="transparent" width="22" height="22"></rect>
                <circle cx="4" cy="11" r="2" fill="#4A4A4A"></circle>
                <circle cx="11" cy="11" r="2" fill="#4A4A4A"></circle>
                <circle cx="18" cy="11" r="2" fill="#4A4A4A"></circle>
            </g>
            <g style="cursor: pointer;" id="base_tree_menu">
                <rect x="0" y="0" width="25" height="25" fill="transparent"></rect>
                ${FamilyTree.icon.addUser(13, 13, "#4A4A4A", 0, 0)}
            </g>
            <g style="cursor: pointer;" id="base_tree_menu_close">
                <circle cx="9" cy="9" r="10" fill="#aeaeae"></circle>
                ${FamilyTree.icon.close(18, 18, "#4A4A4A", 0, 0)}
            </g>            
            <g id="base_up">
                <circle cx="15" cy="15" r="15" fill="#fff" stroke="#aeaeae" stroke-width="1"></circle>
                ${FamilyTree.icon.ft(20, 20, "#aeaeae", 5, 5)}
            </g>
            <clipPath id="base_img_0">
  <rect id="base_img_0_stroke" stroke-width="3" x="8" y="30" rx="10" ry="10" width="168" height="210"></rect>
</clipPath>`;

// Template configurations - posisi icon dipindahkan ke atas
FamilyTree.templates.myTemplate = Object.assign({}, FamilyTree.templates.tommy);
FamilyTree.templates.myTemplate.size = [184, 270];
FamilyTree.templates.myTemplate.nodeTreeMenuButton = `<use ${"data-ctrl-n-t-menu-id"}="{id}" x="165" y="10" xlink:href="#base_tree_menu" />`;
FamilyTree.templates.myTemplate.nodeMenuButton = `<use ${FamilyTree.attr.control_node_menu_id}="{id}" x="10" y="5" xlink:href="#base_node_menu" />`;
FamilyTree.templates.myTemplate.nodeTreeMenuCloseButton = `<use ${"data-ctrl-n-t-menu-c"}="" x="5" y="5" xlink:href="#base_tree_menu_close" />`;

FamilyTree.templates.myTemplate_male = Object.assign({}, FamilyTree.templates.tommy);
FamilyTree.templates.myTemplate_male.size = [184, 270];
FamilyTree.templates.myTemplate_male.nodeTreeMenuButton = `<use ${"data-ctrl-n-t-menu-id"}="{id}" x="165" y="10" xlink:href="#base_tree_menu" />`;
FamilyTree.templates.myTemplate_male.nodeMenuButton = `<use ${FamilyTree.attr.control_node_menu_id}="{id}" x="10" y="5" xlink:href="#base_node_menu" />`;
FamilyTree.templates.myTemplate_male.nodeTreeMenuCloseButton = `<use ${"data-ctrl-n-t-menu-c"}="" x="5" y="5" xlink:href="#base_tree_menu_close" />`;

FamilyTree.templates.myTemplate_female = Object.assign({}, FamilyTree.templates.tommy);
FamilyTree.templates.myTemplate_female.size = [184, 270];
FamilyTree.templates.myTemplate_female.nodeTreeMenuButton = `<use ${"data-ctrl-n-t-menu-id"}="{id}" x="165" y="10" xlink:href="#base_tree_menu" />`;
FamilyTree.templates.myTemplate_female.nodeMenuButton = `<use ${FamilyTree.attr.control_node_menu_id}="{id}" x="10" y="5" xlink:href="#base_node_menu" />`;
FamilyTree.templates.myTemplate_female.nodeTreeMenuCloseButton = `<use ${"data-ctrl-n-t-menu-c"}="" x="5" y="5" xlink:href="#base_tree_menu_close" />`;

// Node styling
FamilyTree.templates.myTemplate_male.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="0" fill="#EAA64D" stroke="#aeaeae" rx="15" ry="15"></rect>`;
FamilyTree.templates.myTemplate_female.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="0" fill="#90D1CA" stroke="#aeaeae" rx="15" ry="15"></rect>`;
FamilyTree.templates.myTemplate_male.editFormHeaderColor = "#EAA64D";
FamilyTree.templates.myTemplate_female.editFormHeaderColor = "#90D1CA";

FamilyTree.templates.mother = Object.assign({}, FamilyTree.templates.base);
FamilyTree.templates.mother.up = "";
FamilyTree.templates.mother.size = [184, 270];
FamilyTree.templates.mother.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#60EDF7" stroke="#aeaeae" rx="15" ry="15"></rect>
    <g transform="translate(92, 100)">
        ${FamilyTree.icon.user(48, 48, "#4A4A4A", 0, 0)}
    </g>
    <text data-width="182" data-text-overflow="ellipsis" style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="200" text-anchor="middle">Add Mother</text>`;

FamilyTree.templates.father = Object.assign({}, FamilyTree.templates.base);
FamilyTree.templates.father.up = "";
FamilyTree.templates.father.size = [184, 270];
FamilyTree.templates.father.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#7DACFF" stroke="#aeaeae" rx="15" ry="15"></rect>
    <g transform="translate(92, 100)">
        ${FamilyTree.icon.user(48, 48, "#4A4A4A", 0, 0)}
    </g>
    <text data-width="182" data-text-overflow="ellipsis" style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="200" text-anchor="middle">Add Father</text>`;

FamilyTree.templates.husband = Object.assign({}, FamilyTree.templates.base);
FamilyTree.templates.husband.up = "";
FamilyTree.templates.husband.size = [184, 270];
FamilyTree.templates.husband.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#7DACFF" stroke="#aeaeae" rx="15" ry="15"></rect>
    <g transform="translate(92, 100)">
        ${FamilyTree.icon.user(48, 48, "#4A4A4A", 0, 0)}
    </g>
    <text data-width="182" data-text-overflow="ellipsis" style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="200" text-anchor="middle">Add Husband</text>`;

FamilyTree.templates.son = Object.assign({}, FamilyTree.templates.base);
FamilyTree.templates.son.up = "";
FamilyTree.templates.son.size = [184, 270];
FamilyTree.templates.son.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#7DACFF" stroke="#aeaeae" rx="15" ry="15"></rect>
    <g transform="translate(92, 100)">
        ${FamilyTree.icon.user(48, 48, "#4A4A4A", 0, 0)}
    </g>
    <text data-width="182" data-text-overflow="ellipsis" style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="200" text-anchor="middle">Add Son</text>`;

FamilyTree.templates.daughter = Object.assign({}, FamilyTree.templates.base);
FamilyTree.templates.daughter.up = "";
FamilyTree.templates.daughter.size = [184, 270];
FamilyTree.templates.daughter.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#60EDF7" stroke="#aeaeae" rx="15" ry="15"></rect>
    <g transform="translate(92, 100)">
        ${FamilyTree.icon.user(48, 48, "#4A4A4A", 0, 0)}
    </g>
    <text data-width="182" data-text-overflow="ellipsis" style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="200" text-anchor="middle">Add Daughter</text>`;

FamilyTree.templates.wife = Object.assign({}, FamilyTree.templates.base);
FamilyTree.templates.wife.up = "";
FamilyTree.templates.wife.size = [184, 270];
FamilyTree.templates.wife.node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#60EDF7" stroke="#aeaeae" rx="15" ry="15"></rect>
    <g transform="translate(92, 100)">
        ${FamilyTree.icon.user(48, 48, "#4A4A4A", 0, 0)}
    </g>
    <text data-width="182" data-text-overflow="ellipsis" style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="200" text-anchor="middle">Add Wife</text>`;

// Field styling - posisi nama dipindahkan ke bawah untuk memberi ruang pada gambar
FamilyTree.templates.myTemplate.field_0 =
  FamilyTree.templates.myTemplate_male.field_0 =
  FamilyTree.templates.myTemplate_female.field_0 =
  `<text data-width="182" data-text-overflow="ellipsis"  style="font-size: 18px; font-weight: bold" fill="#4A4A4A" x="92" y="262" text-anchor="middle">{val}</text>`;

// Image styling - gambar diturunkan dan ukurannya disesuaikan
FamilyTree.templates.myTemplate.img_0 =
  FamilyTree.templates.myTemplate_male.img_0 =
  FamilyTree.templates.myTemplate_female.img_0 =
  `<use xlink:href="#base_img_0_stroke" />
            <image preserveAspectRatio="xMidYMid slice" clip-path="url(#base_img_0)" xlink:href="{val}" x="8" y="30" width="168" height="210" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"></image>
            <g style="display:none" class="default-avatar">
                <rect x="8" y="30" width="168" height="210" fill="#3f3f46" rx="10" ry="10"></rect>
                <g transform="translate(92, 135)">
                    <path d="M-24 -16C-24 -27.0457 -15.0457 -36 -4 -36C7.0457 -36 16 -27.0457 16 -16C16 -4.9543 7.0457 4 -4 4C-15.0457 4 -24 -4.9543 -24 -16Z" 
                          fill="#9CA3AF" stroke="#9CA3AF" stroke-width="2"/>
                    <path d="M-40 44V36C-40 24.9543 -31.0457 16 -20 16H12C23.0457 16 32 24.9543 32 36V44" 
                          fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
            </g>`;

// Placeholder templates
const placeholderTemplates = ["mother", "father", "husband", "son", "daughter", "wife"];
const placeholderColors = {
  mother: "#60EDF7",
  father: "#7DACFF",
  husband: "#7DACFF",
  son: "#7DACFF",
  daughter: "#60EDF7",
  wife: "#60EDF7",
};

placeholderTemplates.forEach((templateName) => {
  FamilyTree.templates[templateName] = Object.assign({}, FamilyTree.templates.base);
  FamilyTree.templates[templateName].up = "";
  FamilyTree.templates[templateName].size = [184, 270];
  FamilyTree.templates[templateName].node = `<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="${placeholderColors[templateName as keyof typeof placeholderColors]}" stroke="#aeaeae" rx="15" ry="15"></rect>
                <text data-width="182" data-text-overflow="ellipsis"  style="font-size: 20px; font-weight: bold" fill="#4A4A4A" x="92" y="140" text-anchor="middle">Add ${templateName.charAt(0).toUpperCase() + templateName.slice(1)}</text>`;
});

FamilyTree.elements.myTextArea = function (data: any, editElement: any, minWidth: any, readOnly: any) {
  const id = FamilyTree.elements.generateId();
  let value = data[editElement.binding];
  if (value === undefined) value = "";

  // Jangan tampilkan apa pun jika readonly dan tidak ada isi
  if (readOnly && !value) {
    return {
      html: "",
    };
  }

  const rOnlyAttr = readOnly ? "readonly" : "";
  const rDisabledAttr = readOnly ? "disabled" : "";

  // Style <textarea>
  const textAreaStyle = readOnly ? "border: none; background: transparent; resize: none; color: #CCC;" : "border: 1px solid #ccc; background: transparent;";

  // Style <label>
  const labelStyle = readOnly ? "color: #CCC; padding-left: 8px; display: inline-block;" : "color: #CCC;";

  return {
    html: `<div class="textarea-field">
      <label style="${labelStyle}">Note</label>
      <textarea
        ${rDisabledAttr}
        ${rOnlyAttr}
        placeholder="Note"
        id="${id}"
        name="${id}"
        style="width: 100%; height: 100px; ${textAreaStyle}"
        data-binding="${editElement.binding}"
      >${value}</textarea>
    </div>`,
    id: id,
    value: value,
  };
};

FamilyTree.elements.myInputFile = function (data: any, editElement: any, minWidth: any, readOnly: any) {
  const id = FamilyTree.elements.generateId();
  let currentPhotoUrl = data[editElement.binding] || "";
  const nodeId = data.id; // Ambil nodeId dari data node

  if (readOnly) {
    return {
      html: `<div style="display: none;"></div>`,
      id: id,
      value: currentPhotoUrl,
    };
  }

  const changePhotoButton = currentPhotoUrl
    ? `<button type="button" onclick="handleFileSelectWithNodeId('${nodeId}', '${id}')" 
         style="background: #039be5; color: #fff; border: 1px solid #039be5; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; height: 100%;">
         Ganti Foto
       </button>`
    : "";

  return {
    html: `<div class="input-file-field">
              ${currentPhotoUrl ? changePhotoButton : ""}
              <input 
                type="file" 
                accept="image/*"
                id="${id}" 
                name="${id}" 
                placeholder="Select new image"
                style="width: 100%; height: 40px; ${currentPhotoUrl ? "display: none;" : ""}" 
                data-binding="${editElement.binding}" 
                data-node-id="${nodeId}"
                onchange="handleFileSelectWithNodeId('${nodeId}', '${id}', event)" 
              />
              <input 
                type="hidden" 
                id="${id}_url" 
                data-binding="${editElement.binding}" 
                value="${currentPhotoUrl}" 
              />
           </div>`,
    id: id,
    value: currentPhotoUrl,
  };
};

FamilyTree.elements.myChangePhotoButton = function (data: any, editElement: any, minWidth: any, readOnly: any) {
  const id = FamilyTree.elements.generateId();
  const currentPhotoUrl = data["photo"] || "";

  if (readOnly || !currentPhotoUrl) {
    return {
      html: "",
      id: id,
      value: "",
    };
  }

  return {
    html: `<div style="margin-top: -40px; margin-left: 120px;">
              <button type="button" onclick="document.querySelector('input[data-binding=photo]').click()" 
                     style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                Ganti Foto
              </button>
           </div>`,
    id: id,
    value: "",
  };
};

export default function Tree({ dataTree, onUpdate }: FamilyTreeComponentProps) {
  const treeRef = useRef<FamilyTree | null>(null);
  const [dialogStatus, setDialogStatus] = useState(false);
  const router = useRouter();
  const [idNode, setIdNode] = useState<string | null>(null);
  const xmlSnapshotRef = useRef<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previousJsonNodes, setPreviousJsonNodes] = useState(dataTree.file);

  const [cropModal, setCropModal] = useState({
    isOpen: false,
    imageSrc: "",
    nodeId: "",
    position: { x: 100, y: 100 },
  })

  const [treeMetadata, setTreeMetadata] = useState({
    id: dataTree.id,
    name: dataTree.name,
    description: dataTree.description,
  });

  // Move nodeBinding inside useMemo to prevent unnecessary re-renders
  const nodeBinding = useMemo(
    () => ({
      field_0: "name",
      img_0: "photo", // pastikan ini sesuai dengan binding field foto
    }),
    []
  );

  const handleUpdateSuccess = useCallback((updatedData: { id: number; name: string; description: string }) => {
    setTreeMetadata((prev) => ({
      ...prev,
      name: updatedData.name,
      description: updatedData.description,
    }));
  }, []);

  // Function untuk menghapus foto lama dari storage
  const deleteOldPhoto = useCallback(async (photoUrl: string) => {
    if (!photoUrl || !photoUrl.includes("image-tree")) return;

    try {
      // Extract file path from URL, handle URL parameters
      // const urlParts = photoUrl.split('?')[0].split('/'); // Remove parameters first
      // const fileName = urlParts[urlParts.length - 1];

      const extractFilePath = (url: string) => {
        const baseUrl = supabase.storage.from("image-tree").getPublicUrl("").data.publicUrl;
        return url.replace(baseUrl, "").replace(/^\/+/, "");
      };

      const filePath = extractFilePath(photoUrl);

      console.log("Attempting to delete file:", filePath); // Debug log

      const { error } = await supabase.storage.from("image-tree").remove([`${filePath}`]);

      if (error) {
        console.error("Error deleting old photo:", error);
      } else {
        console.log("Old photo deleted successfully:", filePath);
      }
    } catch (error) {
      console.error("Error deleting old photo:", error);
    }
  }, []);

  // Function untuk upload foto ke storage
  const uploadImageToStorage = useCallback(async (file: File, nodeId: string) => {
    try {
      const fileName = `image-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("image-tree").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        const imageUrlPath = await supabase.storage.from("image-tree").getPublicUrl(data.path).data.publicUrl;
        return imageUrlPath;
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }, []);

  // Function untuk handle file selection (tidak langsung upload)
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !idNode) return;

      // Reset input value
      event.target.value = '';

      // Get better position - center of screen atau dekat dengan form
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const modalWidth = 420;
      const modalHeight = 450;

      const position = {
        x: Math.max(50, (viewportWidth - modalWidth) / 2), // Center horizontally
        y: Math.max(50, (viewportHeight - modalHeight) / 2), // Center vertically
      };

      // Create preview URL and open crop modal
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCropModal({
          isOpen: true,
          imageSrc: result,
          nodeId: idNode,
          position,
        });
      };
      reader.readAsDataURL(file);
    },
    [idNode]
  );

  const handleFileSelectWithNodeId = useCallback(
    (nodeId: string, inputId?: string, event?: React.ChangeEvent<HTMLInputElement>) => {
      let file: File | undefined;

      if (event) {
        // Dipanggil dari onChange
        file = event.target.files?.[0];
      } else if (inputId) {
        // Dipanggil dari button click, trigger file input
        const fileInput = document.getElementById(inputId) as HTMLInputElement;
        if (fileInput) {
          fileInput.click();
          return;
        }
      }

      if (!file || !nodeId) return;

      // Reset input value jika ada event
      if (event) {
        event.target.value = "";
      }

      // Get better position - center of screen atau dekat dengan form
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const modalWidth = 420;
      const modalHeight = 450;

      const position = {
        x: Math.max(50, (viewportWidth - modalWidth) / 2),
        y: Math.max(50, (viewportHeight - modalHeight) / 2),
      };

      // Create preview URL and open crop modal
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCropModal({
          isOpen: true,
          imageSrc: result,
          nodeId: nodeId,
          position,
        });
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleCropConfirm = useCallback((croppedFile: File) => {
    const nodeId = cropModal.nodeId;
    if (!nodeId) return;

    // Get current photo URL from hidden input
    const hiddenInput = document.querySelector('input[type="hidden"][data-binding="photo"]') as HTMLInputElement;
    const oldPhotoUrl = hiddenInput?.value || "";

    // Store cropped and compressed file for upload
    pendingImageUploads[nodeId] = {
      file: croppedFile,
      oldPhotoUrl: oldPhotoUrl || undefined,
    };

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      // Update preview image in form
      const imgElement = document.querySelector(`img[alt="Current photo"]`) as HTMLImageElement;
      if (imgElement) {
        imgElement.src = result;
      }

      // Update hidden input value temporarily for preview
      const hiddenInput = document.querySelector('input[type="hidden"][data-binding="photo"]') as HTMLInputElement;
      if (hiddenInput) {
        hiddenInput.value = result;
      }

      // Show change photo button and hide file input
      const fileInput = document.querySelector('input[type="file"][data-binding="photo"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.style.display = "none";

        // Add change photo button if not exists
        const container = fileInput.closest(".input-file-field");
        if (container && !container.querySelector("button")) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Ganti Foto";
          button.style.cssText = "background: #039be5; color: #fff; border: 1px solid #039be5; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; height: 100%;";
          button.onclick = () => fileInput.click();
          container.appendChild(button);
        }
      }
    };
    reader.readAsDataURL(croppedFile);

    // Close crop modal
    setCropModal({ isOpen: false, imageSrc: '', nodeId: '', position: { x: 100, y: 100 } });
  }, [cropModal.nodeId]);

  const handleCropCancel = useCallback(() => {
    setCropModal({ isOpen: false, imageSrc: '', nodeId: '', position: { x: 100, y: 100 } });
  }, []);

  const handleDialogOpen = useCallback((status: boolean) => {
    setDialogStatus(status);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogStatus(false);
  }, []);

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Logout gagal: " + error.message);
    } else {
      localStorage.clear();
      sessionStorage.clear();
      router.push("/auth");
    }
  }, [router]);

  // const handleSaveTree = useCallback(async () => {
  //   if (!treeRef.current) return;

  //   try {
  //     xmlSnapshotRef.current = treeRef.current.getXML();
  //     const jsonNodes = convertXmlToJson(xmlSnapshotRef.current);
  //     const { data: updatedData, error } = await supabase.from("trees").update({ file: jsonNodes }).eq("id", dataTree.id);

  //     if (error) {
  //       console.error("Error saving tree:", error);
  //       alert("Error saving tree");
  //     } else {
  //       console.log("Tree saved successfully:", updatedData);
  //       alert("Tree saved successfully");
  //     }
  //   } catch (error) {
  //     alert("Error saving tree");
  //     console.error("Error saving tree:", error);
  //   }
  // }, [dataTree.id]);

  const handleSaveTree = useCallback(async () => {
    if (!treeRef.current) return;

    try {
      xmlSnapshotRef.current = treeRef.current.getXML();
      const jsonNodes = convertXmlToJson(xmlSnapshotRef.current);

      // Bandingkan dengan data sebelumnya untuk mendeteksi node yang dihapus
      const deletedNodes = previousJsonNodes.filter(
        (oldNode: NodeData) => !jsonNodes.some((newNode: any) => newNode.id === oldNode.id)
      );

      // Hapus gambar dari storage untuk node yang dihapus
      if (deletedNodes.length > 0) {
        for (const deletedNode of deletedNodes) {
          if (deletedNode.photo && deletedNode.photo.includes("image-tree")) {
            console.log("Deleting image for removed node:", deletedNode.id, deletedNode.photo);
            await deleteOldPhoto(deletedNode.photo);
          }
        }
      }

      const { data: updatedData, error } = await supabase
        .from("trees")
        .update({ file: jsonNodes })
        .eq("id", dataTree.id);

      if (error) {
        console.error("Error saving tree:", error);
        alert("Error saving tree");
      } else {
        console.log("Tree saved successfully:", updatedData);
        // Update previousJsonNodes dengan data terbaru
        setPreviousJsonNodes(jsonNodes);
        alert("Tree saved successfully");
        // PANGGIL onUpdate SETELAH BERHASIL SAVE
        if (onUpdate) {
          await onUpdate();
        }
      }
    } catch (error) {
      alert("Error saving tree");
      console.error("Error saving tree:", error);
    }
  }, [dataTree.id, onUpdate, previousJsonNodes, deleteOldPhoto]);

  // Process pending image uploads when form is saved
  const processPendingUploads = useCallback(
    async (nodeData: any) => {
      const nodeId = nodeData.id;
      const pendingUpload = pendingImageUploads[nodeId];

      if (!pendingUpload) return nodeData;

      setIsUploading(true);

      try {
        // Upload new image
        const newImageUrl = await uploadImageToStorage(pendingUpload.file, nodeId);

        // Delete old image if exists
        if (pendingUpload.oldPhotoUrl) {
          deleteOldPhoto(pendingUpload.oldPhotoUrl);
        }

        // Update node data with new image URL
        nodeData.photo = newImageUrl;

        // Remove from pending uploads
        delete pendingImageUploads[nodeId];

        console.log(`Image uploaded successfully for node ${nodeId}:`, newImageUrl);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error("Error processing image upload:", error);
        alert("Error uploading image: " + (error as Error).message);
        // Keep old photo on error
        if (pendingUpload.oldPhotoUrl) {
          nodeData.photo = pendingUpload.oldPhotoUrl;
        }
      } finally {
        setIsUploading(false);
      }

      return nodeData;
    },
    [uploadImageToStorage, deleteOldPhoto]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set global function untuk file selection
    (window as any).handleFileSelect = handleFileSelect;
    (window as any).handleFileSelectWithNodeId = handleFileSelectWithNodeId;

    const el = document.getElementById("tree");
    if (!el) return;

    const importCSVHandler = () => {
      if (treeRef.current) treeRef.current.importCSV();
    };

    treeRef.current = new FamilyTree(el, {
      mode: "dark",
      template: "myTemplate",
      nodes: dataTree.file.map((node: NodeData) => ({
        ...node,
        photo:
          node.photo ||
          (isUploading
            ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTY4IiBoZWlnaHQ9IjIxMCIgdmlld0JveD0iMCAwIDE2OCAyMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2OCIgaGVpZ2h0PSIyMTAiIGZpbGw9IiMzZjNmNDYiIHJ4PSIxMCIgcnk9IjEwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODQsIDEwNSkiPjxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSIyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjMiPjxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgYXR0cmlidXRlVHlwZT0iWE1MIiB0eXBlPSJyb3RhdGUiIGZyb209IjAgMCAwIiB0bz0iMzYwIDAgMCIgZHVyPSIxcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz48L2NpcmNsZT48Y2lyY2xlIGN4PSIwIiBjeT0iLTIwIiByPSI0IiBmaWxsPSIjOUNBM0FGIj48YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIGF0dHJpYnV0ZVR5cGU9IlhNTCIgdHlwZT0icm90YXRlIiBmcm9tPSIwIDAgMCIgdG89IjM2MCAwIDAiIGR1cj0iMXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+PC9jaXJjbGU+PC9nPjx0ZXh0IHg9Ijg0IiB5PSIxNjAiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VXBsb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg=="
            : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTY4IiBoZWlnaHQ9IjIxMCIgdmlld0JveD0iMCAwIDE2OCAyMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjgiIGhlaWdodD0iMjEwIiBmaWxsPSIjM2YzZjQ2IiByeD0iMTAiIHJ5PSIxMCIvPgo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4NCwgMTA1KSI+CjxwYXRoIGQ9Ik0tMjQgLTE2Qy0yNCAtMjcuMDQ1NyAtMTUuMDQ1NyAtMzYgLTQgLTM2QzcuMDQ1NyAtMzYgMTYgLTI3LjA0NTcgMTYgLTE2QzE2IC00Ljk1NDMgNy4wNDU3IDQgLTQgNEMtMTUuMDQ1NyA0IC0yNCAtNC45NTQzIC0yNCAtMTZaIiBmaWxsPSIjOUNBM0FGIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNLTQwIDQ0VjM2Qy00MCAyNC45NTQzIC0zMS4wNDU3IDE2IC0yMCAxNkgxMkMyMy4wNDU3IDE2IDMyIDI0Ljk1NDMgMzIgMzZWNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9nPgo8L3N2Zz4K"
          ),
      })),
      nodeBinding,
      menu: {
        home: {
          text: "Edit Meta Data",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="grey" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path></svg>`,
          onClick: () => handleDialogOpen(true),
        },
        // save: {
        //   text: "Save",
        //   icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="grey" viewBox="0 0 256 256"><path d="M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48H172.69L208,83.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z"></path></svg>`,
        //   onClick: handleSaveTree,
        // },
        importCSV: {
          text: "Import CSV",
          icon: FamilyTree.icon.csv(24, 24, "grey"),
          onClick: importCSVHandler,
        },
        pdf: { text: "Export PDF" },
        png: { text: "Export PNG" },
        csv: { text: "Export CSV" },
        logout: {
          text: "Logout",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="grey" viewBox="0 0 256 256"><path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z"></path></svg>`,
          onClick: handleLogout,
        },
      },
      nodeMenu: {
        details: { text: "Details" },
        edit: { text: "Edit" },
      },
      nodeTreeMenu: true,
      miniMap: true,
      toolbar: {
        zoom: true,
        fit: true,
        expandAll: true,
      },
      undoRedoStorageName: "myStorageName",
      editForm: {
        photoBinding: "photo",
        generateElementsFromFields: false,
        addMore: undefined,
        elements: [
          { type: "textbox", label: "Full Name", binding: "name", vlidators: { required: "Is required" } },
          { type: "date", label: "Birth Date", binding: "birthDate" },
          { type: "date", label: "Death Date", binding: "deathDate" },
          {
            type: "select",
            label: "Gender",
            binding: "gender",
            options: [
              { value: "male", text: "Male" },
              { value: "female", text: "Female" },
            ],
          },
          { type: "textbox", label: "Phone Number", binding: "phone" },
          { type: "textbox", label: "Email Address", binding: "email" },
          { type: "textbox", label: "Address", binding: "address" },
          { type: "textbox", label: "Occupation", binding: "occupation" },
          { type: "myTextArea", label: "Note", binding: "note" },
          { type: "myInputFile", label: "Photo", binding: "photo" },
        ],
        buttons: {
          pdf: null,
          share: null,
        },
      },
    });

    // Event handler untuk click node
    treeRef.current.on("click", (sender: any, args: any) => {
      setIdNode(args.node.id);
    });

    treeRef.current.on('render-link', function (sender: any, args: any) {
      if (args.cnode.ppid != undefined) {
        args.html += '<use xlink:href="#heart" x="' + args.p.xa + '" y="' + args.p.ya + '"/>';
      }
    });

    // Handle form submission - process pending uploads saat Save and Close
    // treeRef.current.on("update", (sender: any, args: any) => {
    //   if (args.updateNodesData && args.updateNodesData.length > 0) {
    //     // Process uploads asynchronously without blocking the event handler
    //     (async () => {
    //       // Process each node that has pending image uploads
    //       for (let i = 0; i < args.updateNodesData.length; i++) {
    //         const nodeData = args.updateNodesData[i];
    //         args.updateNodesData[i] = await processPendingUploads(nodeData);
    //       }

    //       // Save updated tree to database after all uploads are complete
    //       try {
    //         xmlSnapshotRef.current = treeRef.current?.getXML() || "";
    //         const jsonNodes = convertXmlToJson(xmlSnapshotRef.current);
    //         const { data: updateResult, error: dbError } = await supabase.from("trees").update({ file: jsonNodes }).eq("id", dataTree.id);

    //         if (dbError) {
    //           console.error("Error saving tree:", dbError);
    //           alert("Error menyimpan ke database");
    //         } else {
    //           console.log("Tree saved successfully:", updateResult);
    //         }
    //       } catch (error) {
    //         console.error("Error saving tree:", error);
    //         alert("Error menyimpan tree");
    //       }
    //     })();
    //   }
    // });

    treeRef.current.on("update", (sender: any, args: any) => {
      if (args.updateNodesData && args.updateNodesData.length > 0) {
        (async () => {
          // Process each node that has pending image uploads
          for (let i = 0; i < args.updateNodesData.length; i++) {
            const nodeData = args.updateNodesData[i];
            args.updateNodesData[i] = await processPendingUploads(nodeData);
          }

          // await new Promise((resolve) => setTimeout(resolve, 3000));

          // Save updated tree to database after all uploads are complete
          try {
            xmlSnapshotRef.current = treeRef.current?.getXML() || "";
            const jsonNodes = convertXmlToJson(xmlSnapshotRef.current);
            const { data: updateResult, error: dbError } = await supabase
              .from("trees")
              .update({ file: jsonNodes })
              .eq("id", dataTree.id);

            if (dbError) {
              console.error("Error saving tree:", dbError);
              alert("Error menyimpan ke database");
            } else {
              console.log("Tree saved successfully:", updateResult);
              setPreviousJsonNodes(jsonNodes);
              // PANGGIL onUpdate SETELAH BERHASIL SAVE
              if (onUpdate) {
                await onUpdate();
              }
            }
          } catch (error) {
            console.error("Error saving tree:", error);
            alert("Error menyimpan tree");
          }
        })();
      }
    });

    return () => {
      // Cleanup
      if (treeRef.current) {
        treeRef.current = null;
      }
      // Clear pending uploads
      pendingImageUploads = {};
    };
  }, [dataTree.file, dataTree.id, nodeBinding, handleSaveTree, handleDialogOpen, handleLogout, handleFileSelect, processPendingUploads]);

  return (
    <>
      <Dialog
        status={dialogStatus}
        id={treeMetadata.id}
        name={treeMetadata.name}
        description={treeMetadata.description}
        handleDialogClose={handleDialogClose}
        onUpdateSuccess={handleUpdateSuccess}
      />

      <ImageCropModal
        isOpen={cropModal.isOpen}
        imageSrc={cropModal.imageSrc}
        position={cropModal.position}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      <button
        onClick={handleSaveTree}
        style={{
          position: "fixed",
          // Desktop: kiri atas, Mobile: kanan atas
          top: window.innerWidth > 768 ? "28px" : "85px",
          left: window.innerWidth > 768 ? "160px" : "auto",
          right: window.innerWidth > 768 ? "auto" : "18px",
          // Mobile: ukuran lebih kecil dan posisi yang aman
          padding: window.innerWidth > 768 ? "12px 24px" : "10px 16px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: window.innerWidth > 768 ? "25px" : "20px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: window.innerWidth > 768 ? "16px" : "14px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          boxShadow: window.innerWidth > 768 ? "0 4px 15px rgba(102, 126, 234, 0.4)" : "0 2px 10px rgba(102, 126, 234, 0.3)",
          transition: "all 0.3s ease",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: window.innerWidth > 768 ? "8px" : "6px",
          minWidth: window.innerWidth > 768 ? "100px" : "80px",
          justifyContent: "center",
          // Touch-friendly pada mobile
          minHeight: window.innerWidth <= 768 ? "44px" : "auto",
        }}
        onMouseEnter={(e) => {
          if (window.innerWidth > 768) {
            (e.target as HTMLElement).style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
            (e.target as HTMLElement).style.transform = "translateY(-2px)";
          }
        }}
        onMouseLeave={(e) => {
          if (window.innerWidth > 768) {
            (e.target as HTMLElement).style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
            (e.target as HTMLElement).style.transform = "translateY(0)";
          }
        }}
        // Touch events untuk mobile
        onTouchStart={(e) => {
          if (window.innerWidth <= 768) {
            (e.target as HTMLElement).style.transform = "scale(0.95)";
          }
        }}
        onTouchEnd={(e) => {
          if (window.innerWidth <= 768) {
            (e.target as HTMLElement).style.transform = "scale(1)";
          }
        }}
      >
        <svg width={window.innerWidth > 768 ? "16" : "14"} height={window.innerWidth > 768 ? "16" : "14"} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3ZM19 19H5V5H16.17L19 7.83V19ZM12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12ZM6 6H15V10H6V6Z" />
        </svg>
        {window.innerWidth > 480 ? "Save" : ""}
      </button>

      <div
        id="tree"
        className="w-full"
        style={{
          backgroundColor: "#121212", // latar belakang gelap
          color: "#f1f1f1", // teks terang, jika ada
          minHeight: "100vh", // opsional agar penuh
        }}
      />
    </>
  );
}
